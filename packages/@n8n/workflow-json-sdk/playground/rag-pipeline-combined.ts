/* eslint-disable id-denylist */
import fs from 'fs';

import { workflow, NodeTypes } from '../src';

function createCombinedRAGWorkflow() {
	const wf = workflow({ name: 'RAG Pipeline - Combined Demo' });

	const chat = wf
		.node('Chat Interface')
		.type(NodeTypes.ChatTrigger)
		.position(-1264, 404)
		.parameters({
			options: { responseMode: 'lastNode' },
			public: true,
			mode: 'hostedChat',
			initialMessages:
				'Hello! I can help you with:\n1. Upload documents by sharing files\n2. Answer questions about your documents\n\nWhat would you like to do?',
		});

	const detect = wf
		.node('Detect Intent')
		.type(NodeTypes.Code_v2)
		.position(-1040, 404)
		.parameters({
			mode: 'runOnceForAllItems',
			jsCode: `const input = $input.first().json;
const hasAttachments = input.attachments && input.attachments.length > 0;
const message = (input.chatInput || '').toLowerCase();
const isUpload = hasAttachments || message.includes('upload') || message.includes('add document') || message.includes('store file');
return [{ json: { ...input, intent: isUpload ? 'upload' : 'query', hasFiles: hasAttachments, userMessage: input.chatInput } }];`,
		});

	const route = wf
		.node('Route by Intent')
		.type(NodeTypes.If_v2_2)
		.position(-816, 404)
		.parameters({
			conditions: {
				string: [{ value1: '={{$json.intent}}', operation: 'equals', value2: 'upload' }],
			},
		});

	const docLoader = wf
		.node('Load Documents')
		.type(NodeTypes.DocumentBinaryInputLoader)
		.position(-592, 192)
		.parameters({ binaryDataKey: 'data' });
	const splitter = wf
		.node('Split Text')
		.type(NodeTypes.TextSplitterRecursiveCharacterTextSplitter)
		.position(-512, 400)
		.parameters({
			chunkSize: 1000,
			chunkOverlap: 200,
		});
	const uploadEmbed = wf
		.node('Upload Embeddings')
		.type(NodeTypes.EmbeddingsOpenAi)
		.position(-304, 192)
		.parameters({ model: 'text-embedding-3-small' });
	const pineconeIns = wf
		.node('Store in Pinecone')
		.type(NodeTypes.VectorStorePineconeInsert)
		.position(-480, -32)
		.parameters({
			pineconeIndex: '={{$env.PINECONE_INDEX}}',
			pineconeNamespace: 'documents',
		});
	const success = wf
		.node('Upload Success Message')
		.type(NodeTypes.Set_v3_4)
		.position(-96, 176)
		.parameters({
			mode: 'manual',
			fields: {
				values: [
					{
						name: 'response',
						type: 'string',
						value:
							'✅ Successfully uploaded and processed {{$json.fileName}}! Your document has been chunked and embedded into the knowledge base.',
					},
				],
			},
		});

	const chatModel = wf
		.node('GPT-4 Model')
		.type(NodeTypes.LmChatOpenAi)
		.position(-608, 800)
		.parameters({ model: 'gpt-4o-mini' });
	const queryEmbed = wf
		.node('Query Embeddings')
		.type(NodeTypes.EmbeddingsOpenAi)
		.position(-512, 1216)
		.parameters({ model: 'text-embedding-3-small' });
	const pineconeVS = wf
		.node('Pinecone Vector Store')
		.type(NodeTypes.VectorStorePinecone)
		.position(-592, 1008)
		.parameters({ pineconeIndex: '={{$env.PINECONE_INDEX}}' });
	const vsTool = wf
		.node('Answer questions with vector store')
		.type(NodeTypes.ToolVectorStore)
		.position(-480, 800)
		.parameters({
			description:
				'Access the vector store to collect information containing PDF, CSV and JSON data the user has uploaded.',
		});
	const toolModel = wf
		.node('Tool Chat Model')
		.type(NodeTypes.LmChatOpenAi)
		.position(-304, 1008)
		.parameters({ model: 'gpt-4o-mini' });
	const agent = wf
		.node('RAG Agent')
		.type(NodeTypes.Agent_v3)
		.position(-576, 576)
		.parameters({ promptType: 'auto' });

	const format = wf
		.node('Format Response')
		.type(NodeTypes.Code_v2)
		.position(-96, 576)
		.parameters({
			mode: 'runOnceForAllItems',
			jsCode: `const input = $input.first().json;
const output = input.output || input.response || '';
const foundAnswer = !output.toLowerCase().includes("couldn't find") && !output.toLowerCase().includes("don't have") && output.length > 20;
const metadata = input.metadata || {};
const sources = metadata.sources || [];
let formattedResponse = output;
if (foundAnswer && sources.length > 0) { formattedResponse += '\\n\\n📚 Sources: ' + sources.slice(0, 3).join(', '); }
return [{ json: { response: formattedResponse, foundAnswer, sourceCount: sources.length, query: input.userMessage, timestamp: new Date().toISOString() } }];`,
		});

	const merge = wf
		.node('Merge Results')
		.type(NodeTypes.Merge_v3_2)
		.version(3.2)
		.position(152, 404)
		.parameters({
			mode: 'combine',
			combineBy: 'combineAll',
		});

	const log = wf
		.node('Log to JSON')
		.type(NodeTypes.Code_v2)
		.position(376, 404)
		.parameters({
			mode: 'runOnceForAllItems',
			jsCode: `const input = $input.first().json;
const logEntry = { timestamp: new Date().toISOString(), intent: input.intent, query: input.query || input.userMessage, response: input.response, foundAnswer: input.foundAnswer !== false, sourceCount: input.sourceCount || 0, sessionId: $execution.id };
console.log('RAG Interaction:', JSON.stringify(logEntry, null, 2));
return [{ json: { ...input, logged: true, logEntry } }];`,
		});

	const response = wf
		.node('Send Chat Response')
		.type(NodeTypes.Code_v2)
		.position(600, 404)
		.parameters({
			mode: 'runOnceForAllItems',
			jsCode: `const input = $input.first().json;
return [{ json: { output: input.response || 'Processing complete!', metadata: { timestamp: input.timestamp, intent: input.intent, sources: input.sourceCount } } }];`,
		});

	wf.connection().from(chat).to(detect);
	wf.connection().from(detect).to(route);
	wf.connection().from({ node: route, type: 'main', index: 0 }).to(pineconeIns);
	wf.connection().from({ node: splitter, type: 'ai_textSplitter', index: 0 }).to({
		node: docLoader,
		type: 'ai_textSplitter',
		index: 0,
	});
	wf.connection().from({ node: docLoader, type: 'ai_document', index: 0 }).to({
		node: pineconeIns,
		type: 'ai_document',
		index: 0,
	});
	wf.connection().from({ node: uploadEmbed, type: 'ai_embedding', index: 0 }).to({
		node: pineconeIns,
		type: 'ai_embedding',
		index: 0,
	});
	wf.connection().from(pineconeIns).to(success);
	wf.connection().from({ node: route, type: 'main', index: 1 }).to(agent);
	wf.connection().from({ node: queryEmbed, type: 'ai_embedding', index: 0 }).to({
		node: pineconeVS,
		type: 'ai_embedding',
		index: 0,
	});
	wf.connection().from({ node: pineconeVS, type: 'ai_vectorStore', index: 0 }).to({
		node: vsTool,
		type: 'ai_vectorStore',
		index: 0,
	});
	wf.connection().from({ node: toolModel, type: 'ai_languageModel', index: 0 }).to({
		node: vsTool,
		type: 'ai_languageModel',
		index: 0,
	});
	wf.connection()
		.from({ node: vsTool, type: 'ai_tool', index: 0 })
		.to({ node: agent, type: 'ai_tool', index: 0 });
	wf.connection().from({ node: chatModel, type: 'ai_languageModel', index: 0 }).to({
		node: agent,
		type: 'ai_languageModel',
		index: 0,
	});
	wf.connection().from(agent).to(format);
	wf.connection()
		.from({ node: success, type: 'main', index: 0 })
		.to({ node: merge, type: 'main', index: 0 });
	wf.connection()
		.from({ node: format, type: 'main', index: 0 })
		.to({ node: merge, type: 'main', index: 1 });
	wf.connection().from(merge).to(log);
	wf.connection().from(log).to(response);

	return wf.toJSON();
}

const combinedWorkflow = createCombinedRAGWorkflow();
fs.writeFileSync('output-rag.json', JSON.stringify(combinedWorkflow, null, 2), 'utf-8');
console.log('RAG pipeline output to output-rag.json');
