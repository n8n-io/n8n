/* eslint-disable id-denylist */
import fs from 'fs';

import { workflow, NodeTypes } from '../src';

/**
 * Combined RAG Pipeline Workflow - All-in-One Demo
 *
 * This demonstrates a complex workflow with:
 * - Multiple processing paths
 * - AI/LangChain sub-node connections
 * - Conditional branching
 * - Multiple node types working together
 *
 * Flow:
 * 1. Chat Trigger receives user message
 * 2. Check if it's an upload request or query
 * 3. Upload path: Process files → Embed → Store in Pinecone
 * 4. Query path: Retrieve from Pinecone → Generate answer
 * 5. All interactions logged and processed
 */
function createCombinedRAGWorkflow() {
	const wf = workflow({ name: 'RAG Pipeline - Combined Demo' });

	// ============================================================
	// MAIN TRIGGER
	// ============================================================

	const chatTrigger = wf
		.node('Chat Interface')
		.type(NodeTypes.ChatTrigger)
		.position(-1264, 404)
		.parameters({
			options: {
				responseMode: 'lastNode',
			},
			public: true,
			mode: 'hostedChat',
			initialMessages:
				'Hello! I can help you with:\n1. Upload documents by sharing files\n2. Answer questions about your documents\n\nWhat would you like to do?',
		});

	// ============================================================
	// ROUTE DETECTION - Check if user is uploading or querying
	// ============================================================

	const routeDetector = wf
		.node('Detect Intent')
		.type(NodeTypes.Code_v2)
		.position(-1040, 404)
		.parameters({
			mode: 'runOnceForAllItems',
			jsCode: `// Detect if this is a file upload or a query
const input = $input.first().json;
const hasAttachments = input.attachments && input.attachments.length > 0;
const message = (input.chatInput || '').toLowerCase();

// Check for upload intent
const isUpload = hasAttachments ||
  message.includes('upload') ||
  message.includes('add document') ||
  message.includes('store file');

return [{
  json: {
    ...input,
    intent: isUpload ? 'upload' : 'query',
    hasFiles: hasAttachments,
    userMessage: input.chatInput
  }
}];`,
		});

	// Route based on intent
	const intentSwitch = wf
		.node('Route by Intent')
		.type(NodeTypes.If_v2_2)
		.position(-816, 404)
		.parameters({
			conditions: {
				string: [
					{
						value1: '={{$json.intent}}',
						operation: 'equals',
						value2: 'upload',
					},
				],
			},
		});

	// ============================================================
	// UPLOAD PATH (True branch)
	// ============================================================

	// Document loader for uploaded files
	const documentLoader = wf
		.node('Load Documents')
		.type(NodeTypes.DocumentBinaryInputLoader)
		.position(-592, 192)
		.parameters({
			binaryDataKey: 'data',
		});

	// Text splitter
	const textSplitter = wf
		.node('Split Text')
		.type(NodeTypes.TextSplitterRecursiveCharacterTextSplitter)
		.position(-512, 400)
		.parameters({
			chunkSize: 1000,
			chunkOverlap: 200,
		});

	// Embeddings for upload
	const uploadEmbeddings = wf
		.node('Upload Embeddings')
		.type(NodeTypes.EmbeddingsOpenAi)
		.position(-304, 192)
		.parameters({
			model: 'text-embedding-3-small',
		});

	// Store in Pinecone
	const pineconeInsert = wf
		.node('Store in Pinecone')
		.type(NodeTypes.VectorStorePineconeInsert)
		.position(-480, -32)
		.parameters({
			pineconeIndex: '={{$env.PINECONE_INDEX}}',
			pineconeNamespace: 'documents',
		});

	// Success message
	const uploadSuccess = wf
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

	// ============================================================
	// QUERY PATH (False branch)
	// ============================================================

	// OpenAI Chat Model
	const chatModel = wf
		.node('GPT-4 Model')
		.type(NodeTypes.LmChatOpenAi)
		.position(-608, 800)
		.parameters({
			model: 'gpt-4o-mini',
		});

	// Embeddings for queries
	const queryEmbeddings = wf
		.node('Query Embeddings')
		.type(NodeTypes.EmbeddingsOpenAi)
		.position(-512, 1216)
		.parameters({
			model: 'text-embedding-3-small',
		});

	// Pinecone Vector Store (simplified, no mode specified)
	const pineconeVectorStore = wf
		.node('Pinecone Vector Store')
		.type(NodeTypes.VectorStorePinecone)
		.position(-592, 1008)
		.parameters({
			pineconeIndex: '={{$env.PINECONE_INDEX}}',
		});

	// Vector Store Tool - wraps the vector store as a tool for the agent
	const vectorStoreTool = wf
		.node('Answer questions with vector store')
		.type(NodeTypes.ToolVectorStore)
		.position(-480, 800)
		.parameters({
			description:
				'Access the vector store to collect information containing PDF, CSV and JSON data the user has uploaded.',
		});

	// Additional OpenAI model for the vector store tool
	const toolChatModel = wf
		.node('Tool Chat Model')
		.type(NodeTypes.LmChatOpenAi)
		.position(-304, 1008)
		.parameters({
			model: 'gpt-4o-mini',
		});

	// AI Agent with RAG
	const ragAgent = wf.node('RAG Agent').type(NodeTypes.Agent_v3).position(-576, 576).parameters({
		promptType: 'auto',
	});

	// ============================================================
	// POST-PROCESSING - Format and validate responses
	// ============================================================

	const formatResponse = wf
		.node('Format Response')
		.type(NodeTypes.Code_v2)
		.position(-96, 576)
		.parameters({
			mode: 'runOnceForAllItems',
			jsCode: `const input = $input.first().json;
const output = input.output || input.response || '';

// Check if we found an answer
const foundAnswer = !output.toLowerCase().includes("couldn't find") &&
                     !output.toLowerCase().includes("don't have") &&
                     output.length > 20;

// Extract metadata about sources
const metadata = input.metadata || {};
const sources = metadata.sources || [];

let formattedResponse = output;

if (foundAnswer && sources.length > 0) {
  formattedResponse += '\\n\\n📚 Sources: ' + sources.slice(0, 3).join(', ');
}

return [{
  json: {
    response: formattedResponse,
    foundAnswer,
    sourceCount: sources.length,
    query: input.userMessage,
    timestamp: new Date().toISOString()
  }
}];`,
		});

	// ============================================================
	// MERGE PATHS - Bring upload and query back together
	// ============================================================

	const mergePaths = wf
		.node('Merge Results')
		.type(NodeTypes.Merge_v3_2)
		.version(3.2)
		.position(152, 404)
		.parameters({
			mode: 'combine',
			combineBy: 'combineAll',
		});

	// ============================================================
	// ANALYTICS & LOGGING
	// ============================================================

	const logInteraction = wf
		.node('Log to JSON')
		.type(NodeTypes.Code_v2)
		.position(376, 404)
		.parameters({
			mode: 'runOnceForAllItems',
			jsCode: `const input = $input.first().json;

// Create log entry
const logEntry = {
  timestamp: new Date().toISOString(),
  intent: input.intent,
  query: input.query || input.userMessage,
  response: input.response,
  foundAnswer: input.foundAnswer !== false,
  sourceCount: input.sourceCount || 0,
  sessionId: $execution.id
};

// In production, this would write to a database or file
console.log('RAG Interaction:', JSON.stringify(logEntry, null, 2));

return [{
  json: {
    ...input,
    logged: true,
    logEntry
  }
}];`,
		});

	// ============================================================
	// FINAL RESPONSE - Send back to chat
	// ============================================================

	const chatResponse = wf
		.node('Send Chat Response')
		.type(NodeTypes.Code_v2)
		.position(600, 404)
		.parameters({
			mode: 'runOnceForAllItems',
			jsCode: `const input = $input.first().json;

// Format final message for chat
return [{
  json: {
    output: input.response || 'Processing complete!',
    metadata: {
      timestamp: input.timestamp,
      intent: input.intent,
      sources: input.sourceCount
    }
  }
}];`,
		});

	// ============================================================
	// CONNECTIONS - Main flow
	// ============================================================

	wf.connection().from(chatTrigger).to(routeDetector);
	wf.connection().from(routeDetector).to(intentSwitch);

	// Upload path (true branch - index 0)
	wf.connection().from({ node: intentSwitch, type: 'main', index: 0 }).to(pineconeInsert);

	// AI sub-node connections for upload
	// Split Text → Load Documents → Store in Pinecone
	wf.connection()
		.from({ node: textSplitter, type: 'ai_textSplitter', index: 0 })
		.to({ node: documentLoader, type: 'ai_textSplitter', index: 0 });

	wf.connection()
		.from({ node: documentLoader, type: 'ai_document', index: 0 })
		.to({ node: pineconeInsert, type: 'ai_document', index: 0 });

	wf.connection()
		.from({ node: uploadEmbeddings, type: 'ai_embedding', index: 0 })
		.to({ node: pineconeInsert, type: 'ai_embedding', index: 0 });

	wf.connection().from(pineconeInsert).to(uploadSuccess);

	// Query path (false branch - index 1)
	// Route → RAG Agent (main flow)
	wf.connection().from({ node: intentSwitch, type: 'main', index: 1 }).to(ragAgent);

	// AI sub-node connections for query
	// Query Embeddings → Pinecone Vector Store
	wf.connection()
		.from({ node: queryEmbeddings, type: 'ai_embedding', index: 0 })
		.to({ node: pineconeVectorStore, type: 'ai_embedding', index: 0 });

	// Pinecone Vector Store → Vector Store Tool
	wf.connection()
		.from({ node: pineconeVectorStore, type: 'ai_vectorStore', index: 0 })
		.to({ node: vectorStoreTool, type: 'ai_vectorStore', index: 0 });

	// Tool Chat Model → Vector Store Tool
	wf.connection()
		.from({ node: toolChatModel, type: 'ai_languageModel', index: 0 })
		.to({ node: vectorStoreTool, type: 'ai_languageModel', index: 0 });

	// Vector Store Tool → RAG Agent (as a tool)
	wf.connection()
		.from({ node: vectorStoreTool, type: 'ai_tool', index: 0 })
		.to({ node: ragAgent, type: 'ai_tool', index: 0 });

	// GPT-4 Model → RAG Agent (main language model)
	wf.connection()
		.from({ node: chatModel, type: 'ai_languageModel', index: 0 })
		.to({ node: ragAgent, type: 'ai_languageModel', index: 0 });

	wf.connection().from(ragAgent).to(formatResponse);

	// Merge both paths
	wf.connection()
		.from({ node: uploadSuccess, type: 'main', index: 0 })
		.to({ node: mergePaths, type: 'main', index: 0 });

	wf.connection()
		.from({ node: formatResponse, type: 'main', index: 0 })
		.to({ node: mergePaths, type: 'main', index: 1 });

	// Final processing
	wf.connection().from(mergePaths).to(logInteraction);
	wf.connection().from(logInteraction).to(chatResponse);

	return wf.toJSON();
}

// Generate the combined workflow
const combinedWorkflow = createCombinedRAGWorkflow();

fs.writeFileSync('output-rag.json', JSON.stringify(combinedWorkflow, null, 2), 'utf-8');
console.log('RAG pipeline output to output-rag.json');
