import {
	type IExecuteFunctions,
	type INodeExecutionData,
	type IDataObject,
	NodeConnectionType,
	jsonParse,
} from 'n8n-workflow';
import get from 'lodash/get';
import type { CharacterTextSplitter } from 'langchain/text_splitter';
import { Document } from 'langchain/document';
import { TextLoader } from 'langchain/document_loaders/fs/text';

function isDataObject(value: unknown): value is IDataObject {
	return typeof value === 'object' && value !== null;
}

export function objectToString(obj: Record<string, string> | IDataObject, level = 0): string {
	const result: string[] = [];
	for (const key in obj) {
		const value = obj[key];
		const indent = '  '.repeat(level);
		if (isDataObject(value)) {
			result.push(`${indent}- "${key}":\n${objectToString(value, level + 1)}`);
		} else {
			result.push(`${indent}- "${key}": "${value}"`);
		}
	}
	return result.join('\n');
}

export class JSONLoader extends TextLoader {
	constructor(
		public fileBlob: Blob,
		public dataPath?: string,
	) {
		super(fileBlob);
	}

	protected async parse(raw: string): Promise<string[]> {
		const json = jsonParse(raw.trim());
		// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
		const partial = this.dataPath ? get(json, this.dataPath) : json;
		const returnData = [];

		returnData.push(objectToString(partial as IDataObject));
		return returnData;
	}

	public async load(): Promise<Document[]> {
		const text = await this.fileBlob.text();
		const metadata = { source: 'blob', blobType: this.fileBlob.type };
		const parsed = await this.parse(text);

		return parsed.map(
			(pageContent, index) =>
				new Document({
					pageContent: `### ${index + 1}. Context data:\n${pageContent}`,
					metadata: {
						...metadata,
						itemIndex: index,
					},
				}),
		);
	}
}

export class N8nJsonLoader {
	private context: IExecuteFunctions;

	constructor(context: IExecuteFunctions) {
		this.context = context;
	}

	async process(items?: INodeExecutionData[]): Promise<Document[]> {
		const dataPath = this.context.getNodeParameter('pointers', 0) as string;

		const textSplitter = (await this.context.getInputConnectionData(
			NodeConnectionType.AiTextSplitter,
			0,
		)) as CharacterTextSplitter | undefined;

		const docs: Document[] = [];

		if (!items) return docs;

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			const itemString = JSON.stringify(items[itemIndex].json);

			const itemBlob = new Blob([itemString], { type: 'application/json' });
			const jsonDoc = new JSONLoader(itemBlob, dataPath);
			const loadedDoc = textSplitter
				? await jsonDoc.loadAndSplit(textSplitter)
				: await jsonDoc.load();

			docs.push(...loadedDoc);
		}
		return docs;
	}
}
