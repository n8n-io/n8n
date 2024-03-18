import path from 'path';
import glob from 'fast-glob';
import { Pinecone } from '@pinecone-database/pinecone';
import fs from 'fs';
import { OpenAIEmbeddings } from '@langchain/openai';
import { Document } from '@langchain/core/documents';
import { PineconeStore } from '@langchain/pinecone';

const openAIApiKey = process.env.N8N_OPENAI_API_KEY;
const pineconeApiKey = process.env.N8N_PINECONE_API_KEY;

const pinecone = new Pinecone({
	apiKey: pineconeApiKey,
});

const pcIndex = pinecone.Index('openapi');

const embeddings = new OpenAIEmbeddings({
	openAIApiKey,
	modelName: 'text-embedding-3-small',
});

const paths = glob
	.sync([path.join(__dirname, 'openapi-directory-json', '**/*.json')])
	.slice(0, 100);

const documents: Document[] = [];
const availableOpenAPIServices = [];

paths.forEach((jsonFilePath) => {
	const jsonContents = fs.readFileSync(jsonFilePath, 'utf8');
	const data = JSON.parse(jsonContents);
	const apiPaths = data.paths;

	const pathParts = jsonFilePath
		.replace(path.join(__dirname, 'openapi-directory-json', 'APIs') + path.sep, '')
		.split(path.sep);
	const serviceName = pathParts[0];
	const resourceName = pathParts.length > 3 ? pathParts[1] : undefined;
	const version = pathParts[pathParts.length - 2];
	const serviceTitle = data.info.title;
	const serviceDescription = (data.info.description || '')
		.replace(/<\/?[^>]+(>|$)/g, '')
		.replaceAll('\n', ' ')
		.replaceAll('|', ' ');
	const withHttps = (url: string) => (!url ? '' : url.startsWith('http') ? url : `https://${url}`);
	const serviceHost = withHttps(data.servers?.[0].url || `https://${data.host}`);
	const serviceSecurity = data.securityDefinitions || data.security;
	const securitySchemes = data.components?.securitySchemes || data.securitySchemes;

	availableOpenAPIServices.push({
		title: serviceTitle,
		...(serviceHost ? { host: serviceHost } : {}),
		...(serviceDescription
			? {
					description:
						serviceDescription.length > 200
							? `${serviceDescription.slice(0, 200)}...`
							: serviceDescription,
			  }
			: {}),
		service: serviceName,
		...(serviceSecurity ? { securityDefinitions: serviceSecurity } : {}),
		...(resourceName ? { resource: resourceName } : {}),
		...(securitySchemes ? { components: { securitySchemes } } : {}),
	});

	Object.keys(apiPaths).forEach((apiPathName) => {
		Object.keys(apiPaths[apiPathName]).forEach((apiPathMethodName) => {
			const apiPathMethodDefinition = apiPaths[apiPathName][apiPathMethodName];
			if (Array.isArray(apiPathMethodDefinition)) {
				return;
			}

			const { responses, externalDocs, tags, ...resolvedApiPathMethodDefinition } =
				apiPathMethodDefinition;

			const resolvedPageContent = {
				[apiPathName]: {
					[apiPathMethodName]: resolvedApiPathMethodDefinition,
				},
			};

			const document = new Document({
				metadata: {
					title: serviceTitle,
					service: serviceName,
					resource: resourceName,
					path: pathParts.join('/'),
					version,
				},
				pageContent: JSON.stringify(resolvedPageContent),
			});

			documents.push(document);
		});
	});
});

fs.writeFileSync(
	path.join(__dirname, '..', 'src', 'services', 'ai', 'resources', 'openapi-services.json'),
	JSON.stringify(availableOpenAPIServices),
	'utf8',
);

(async () => {
	await pcIndex.namespace('apiPaths').deleteAll();

	await PineconeStore.fromDocuments(documents, embeddings, {
		pineconeIndex: pcIndex,
		namespace: 'apiPaths',
	});
})();
