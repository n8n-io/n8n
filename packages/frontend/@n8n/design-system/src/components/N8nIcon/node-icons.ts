import NodeAggregate from './nodes/aggregate.svg';
import NodeAiAgent from './nodes/ai-agent.svg';
import NodeAiTransform from './nodes/ai-transform.svg';
import NodeBasicLlmChain from './nodes/basic-llm-chain.svg';
import NodeCalculator from './nodes/calculator.svg';
import NodeCallN8nSubWorkflowTool from './nodes/call-n8n-sub-workflow-tool.svg';
import NodeCharacterTextSplitter from './nodes/character-text-splitter.svg';
import NodeChatMemoryManager from './nodes/chat-memory-manager.svg';
import NodeChatTrigger from './nodes/chat-trigger.svg';
import NodeCode from './nodes/code.svg';
import NodeCompareDatasets from './nodes/compare-datasets.svg';
import NodeCompression from './nodes/compression.svg';
import NodeContextualCompressionRetriever from './nodes/contextual-compression-retriever.svg';
import NodeConvertToFile from './nodes/convert-to-file.svg';
import NodeCrypto from './nodes/crypto.svg';
import NodeDataTable from './nodes/data-table.svg';
import NodeDateAndTime from './nodes/date-and-time.svg';
import NodeDefaultDataLoader from './nodes/default-data-loader.svg';
import NodeEditFields from './nodes/edit-fields.svg';
import NodeEditImage from './nodes/edit-image.svg';
import NodeEmailTrigger from './nodes/email-trigger.svg';
import NodeErrorTrigger from './nodes/error-trigger.svg';
import NodeExecuteCommand from './nodes/execute-command.svg';
import NodeExecuteSubWorkflow from './nodes/execute-sub-workflow.svg';
import NodeExecutionData from './nodes/execution-data.svg';
import NodeExtractFromFile from './nodes/extract-from-file.svg';
import NodeFilter from './nodes/filter.svg';
import NodeFormTrigger from './nodes/form-trigger.svg';
import NodeFtp from './nodes/ftp.svg';
import NodeGuardrails from './nodes/guardrails.svg';
import NodeHtml from './nodes/html.svg';
import NodeHttpRequest from './nodes/http-request.svg';
import NodeIf from './nodes/if.svg';
import NodeInformationExtractor from './nodes/information-extractor.svg';
import NodeItemListOutputParser from './nodes/item-list-output-parser.svg';
import NodeLimit from './nodes/limit.svg';
import NodeLocalFileTrigger from './nodes/local-file-trigger.svg';
import NodeLoopOverItems from './nodes/loop-over-items.svg';
import NodeManualTrigger from './nodes/manual-trigger.svg';
import NodeMarkdown from './nodes/markdown.svg';
import NodeMerge from './nodes/merge.svg';
import NodeModelSelector from './nodes/model-selector.svg';
import NodeMultiqueryRetriever from './nodes/multiquery-retriever.svg';
import NodeN8nTrigger from './nodes/n8n-trigger.svg';
import NodeN8n from './nodes/n8n.svg';
import NodeNoOperation from './nodes/no-operation.svg';
import NodeQuestionAndAnswerChain from './nodes/question-and-answer-chain.svg';
import NodeReadWriteFilesFromDisk from './nodes/read-write-files-from-disk.svg';
import NodeRecursiveCharacterTextSplitter from './nodes/recursive-character-text-splitter.svg';
import NodeRemoveDuplicates from './nodes/remove-duplicates.svg';
import NodeRenameKeys from './nodes/rename-keys.svg';
import NodeRespondToWebhook from './nodes/respond-to-webhook.svg';
import NodeRssFeedTrigger from './nodes/rss-feed-trigger.svg';
import NodeRssRead from './nodes/rss-read.svg';
import NodeScheduleTrigger from './nodes/schedule-trigger.svg';
import NodeSendMail from './nodes/send-mail.svg';
import NodeSentimentAnalysis from './nodes/sentiment-analysis.svg';
import NodeSimpleMemory from './nodes/simple-memory.svg';
import NodeSimpleVectorStore from './nodes/simple-vector-store.svg';
import NodeSort from './nodes/sort.svg';
import NodeSplitOut from './nodes/split-out.svg';
import NodeSseTrigger from './nodes/sse-trigger.svg';
import NodeSsh from './nodes/ssh.svg';
import NodeStopAndError from './nodes/stop-and-error.svg';
import NodeStructuredOutputParser from './nodes/structured-output-parser.svg';
import NodeSubWorkflowTrigger from './nodes/sub-workflow-trigger.svg';
import NodeSummarizationChain from './nodes/summarization-chain.svg';
import NodeSummarize from './nodes/summarize.svg';
import NodeSwitch from './nodes/switch.svg';
import NodeTextClassifier from './nodes/text-classifier.svg';
import NodeThinkTool from './nodes/think-tool.svg';
import NodeTokenSplitter from './nodes/token-splitter.svg';
import NodeTotp from './nodes/totp.svg';
import NodeTrackTimeSaved from './nodes/track-time-saved.svg';
import NodeVectorStoreQuestionAnswerTool from './nodes/vector-store-question-answer-tool.svg';
import NodeVectorStoreRetriever from './nodes/vector-store-retriever.svg';
import NodeWait from './nodes/wait.svg';
import NodeWebhook from './nodes/webhook.svg';
import NodeWorkflowRetriever from './nodes/workflow-retriever.svg';
import NodeXml from './nodes/xml.svg';

export const nodeIconSet = {
	'node:aggregate': NodeAggregate,
	'node:ai-agent': NodeAiAgent,
	'node:ai-transform': NodeAiTransform,
	'node:basic-llm-chain': NodeBasicLlmChain,
	'node:calculator': NodeCalculator,
	'node:call-n8n-sub-workflow-tool': NodeCallN8nSubWorkflowTool,
	'node:character-text-splitter': NodeCharacterTextSplitter,
	'node:chat-memory-manager': NodeChatMemoryManager,
	'node:chat-trigger': NodeChatTrigger,
	'node:code': NodeCode,
	'node:compare-datasets': NodeCompareDatasets,
	'node:compression': NodeCompression,
	'node:contextual-compression-retriever': NodeContextualCompressionRetriever,
	'node:convert-to-file': NodeConvertToFile,
	'node:crypto': NodeCrypto,
	'node:data-table': NodeDataTable,
	'node:date-and-time': NodeDateAndTime,
	'node:default-data-loader': NodeDefaultDataLoader,
	'node:edit-fields': NodeEditFields,
	'node:edit-image': NodeEditImage,
	'node:email-trigger': NodeEmailTrigger,
	'node:error-trigger': NodeErrorTrigger,
	'node:execute-command': NodeExecuteCommand,
	'node:execute-sub-workflow': NodeExecuteSubWorkflow,
	'node:execution-data': NodeExecutionData,
	'node:extract-from-file': NodeExtractFromFile,
	'node:filter': NodeFilter,
	'node:form-trigger': NodeFormTrigger,
	'node:ftp': NodeFtp,
	'node:guardrails': NodeGuardrails,
	'node:html': NodeHtml,
	'node:http-request': NodeHttpRequest,
	'node:if': NodeIf,
	'node:information-extractor': NodeInformationExtractor,
	'node:item-list-output-parser': NodeItemListOutputParser,
	'node:limit': NodeLimit,
	'node:local-file-trigger': NodeLocalFileTrigger,
	'node:loop-over-items': NodeLoopOverItems,
	'node:manual-trigger': NodeManualTrigger,
	'node:markdown': NodeMarkdown,
	'node:merge': NodeMerge,
	'node:model-selector': NodeModelSelector,
	'node:multiquery-retriever': NodeMultiqueryRetriever,
	'node:n8n': NodeN8n,
	'node:n8n-trigger': NodeN8nTrigger,
	'node:no-operation': NodeNoOperation,
	'node:question-and-answer-chain': NodeQuestionAndAnswerChain,
	'node:read-write-files-from-disk': NodeReadWriteFilesFromDisk,
	'node:recursive-character-text-splitter': NodeRecursiveCharacterTextSplitter,
	'node:remove-duplicates': NodeRemoveDuplicates,
	'node:rename-keys': NodeRenameKeys,
	'node:respond-to-webhook': NodeRespondToWebhook,
	'node:rss-feed-trigger': NodeRssFeedTrigger,
	'node:rss-read': NodeRssRead,
	'node:schedule-trigger': NodeScheduleTrigger,
	'node:send-mail': NodeSendMail,
	'node:sentiment-analysis': NodeSentimentAnalysis,
	'node:simple-memory': NodeSimpleMemory,
	'node:simple-vector-store': NodeSimpleVectorStore,
	'node:sort': NodeSort,
	'node:split-out': NodeSplitOut,
	'node:sse-trigger': NodeSseTrigger,
	'node:ssh': NodeSsh,
	'node:stop-and-error': NodeStopAndError,
	'node:structured-output-parser': NodeStructuredOutputParser,
	'node:sub-workflow-trigger': NodeSubWorkflowTrigger,
	'node:summarization-chain': NodeSummarizationChain,
	'node:summarize': NodeSummarize,
	'node:switch': NodeSwitch,
	'node:text-classifier': NodeTextClassifier,
	'node:think-tool': NodeThinkTool,
	'node:token-splitter': NodeTokenSplitter,
	'node:totp': NodeTotp,
	'node:track-time-saved': NodeTrackTimeSaved,
	'node:vector-store-question-answer-tool': NodeVectorStoreQuestionAnswerTool,
	'node:vector-store-retriever': NodeVectorStoreRetriever,
	'node:wait': NodeWait,
	'node:webhook': NodeWebhook,
	'node:workflow-retriever': NodeWorkflowRetriever,
	'node:xml': NodeXml,
} as const;

export type NodeIconName = keyof typeof nodeIconSet;
