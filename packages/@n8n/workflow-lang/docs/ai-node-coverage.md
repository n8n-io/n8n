# AI node coverage (census of the 74k set)

Source: the 77,424 "fully covered" workflows of the 147,671 real workflows (aggregate counts
only). 12,112 of them have one or more enabled nodes of `@n8n/n8n-nodes-langchain`. All counts
are numbers of workflows. Disabled nodes are not counted.

## What is native now

"Native" means: the converter writes the node as a library node (`src/nodes/`), and the
equivalence cases prove that shape against the v1 node in n8n's engine (`ai-cluster.shared.ts` and its shards,
`equivalence.test.ts`). The counts come from the parameter check of the converter on each
workflow; an expression that does not translate can still send a node to the host.

| Measure | Workflows |
|---|---|
| Workflows with AI nodes | 12112 |
| Workflows where every AI root node is native, before this work | 186 |
| Workflows where every AI root node is native, now | 4988 |
| Workflows with one or more native AI root nodes, now | 5505 |

### Measured by a real conversion (sample)

A sample of 2,019 of the 12,112 AI workflows (each sixth one) went through `convertWorkflow`
(with `trace: 'all'`, a stub for called workflows, and no node sources for the node compiler)
and, when no node was left for the fallback host, through `compile`.

| Result | Workflows of the sample | Share | Scaled to 12,112 |
|---|---|---|---|
| No AI node on the fallback host | 909 | 45.0% | about 5,450 |
| Compiles fully (no fallback node of any kind, and the source compiles) | 310 | 15.4% | about 1,860 |
| Fallback nodes are AI nodes only | 328 | 16.2% | about 1,970 |
| Fallback nodes are other nodes only | 599 | 29.7% | about 3,590 |

No conversion failed, and each source without a fallback node compiled. The run had no node
sources, so a node of `n8n-nodes-base` that runs only as code compiled from its source counts
as a fallback node here: the count of workflows that compile fully is a lower bound for the
whole pipeline. The fallback node types with the most workflows in the sample: `agent` 640,
`code` 342, `gmail` 220, `chainLlm` 210, `slack` 178, `googleDrive` 124, `googleSheets` 121,
`set` 115, `openAi` 101, `microsoftOutlook` 95, `postgres` 94, `extractFromFile` 94.

A root node is an AI node that is not a sub-node and not a trigger. A workflow with only a
chat trigger or with unconnected sub-nodes has no root node, and counts as native in both rows.

| Library node | v1 node and shape | Proof |
|---|---|---|
| `openai.ts` | `openAi` 2 to 2.3 `text.response`; 1 to 1.8 `text.message`; no tools | cases against the node and the engine |
| `anthropic.ts` | `anthropic` 1 `text.message`; no attachments, no tools | cases against the node and the engine |
| `google-gemini.ts` | `googleGemini` 1 to 1.2 `text.message`; no built-in tools | cases against the node and the engine |
| `chain-llm.ts` | `chainLlm` 1 to 1.9 with `lmChatOpenAi` 1 to 1.3, `lmChatOpenRouter`, `lmChatAnthropic` 1 to 1.5 (no thinking options, no gateway URL) or `lmChatGoogleGemini` 1 and 1.1 (host of Google only); text prompt and messages; all error settings; batches | cases against the engine with the real sub-node |
| `chain-llm.ts` (`kind: 'agent'`) | `agent` 2 to 3.1 (Tools Agent) with the same models; no tool, memory or parser | cases against the engine with the real sub-node |
| `chain-llm.ts` (`kind: 'agent'`, `aiMemory`) | the same agent with `memoryBufferWindow` 1 to 1.3: session key (`customKey`), window 1 to 1000, batch size 1; no tool or parser. Only with `ConvertOptions.chatMemory` (default off: the store is the service `chatMemory`, which no client answers yet). The census tables below predate this row | cases against the engine with the real sub-nodes and a store of the test |

| `chain-llm.ts` (`kind: 'agent'`, `outputParser`) | the same agent with `outputParserStructured` 1.2 and 1.3 without auto-fixing, on each native chat model, with or without the HTTP Request tool; no memory. Also `lmChatGoogleGemini` 1.2 and the default model of each version of that node. The census tables below predate this row | cases against the engine with the real sub-nodes |
| `chain-llm.ts` (`kind: 'agent'`, versions 1.6 to 1.9) | the Tools Agent before version 2 with `lmChatOpenAi` (Chat Completions) or `lmChatOpenRouter` and nothing else: the answer is a stream of text | cases against the engine with the real sub-node |

### Root node types: workflows, and workflows where the node is native

| Root node type | Workflows | Native now |
|---|---|---|
| `agent` | 5233 | 1028 |
| `openAi` | 3014 | 2593 |
| `chainLlm` | 1805 | 506 |
| `anthropic` | 1246 | 1088 |
| `googleGemini` | 668 | 385 |
| `informationExtractor` | 350 | 0 |
| `textClassifier` | 275 | 0 |
| `vectorStoreSupabase` | 190 | 0 |
| `vectorStoreInMemory` | 45 | 0 |
| `memoryManager` | 30 | 0 |
| `guardrails` | 29 | 0 |
| `chainSummarization` | 28 | 0 |
| `sentimentAnalysis` | 15 | 0 |
| `lmChatOpenAi` | 15 | 0 |
| `outputParserStructured` | 13 | 0 |
| `mcpClient` | 12 | 0 |

### Shapes: workflows, and workflows where the shape is native

For `chainLlm` and `agent`: the chat model, the memory, tools (yes or none) and the output
parser. For a vendor node: the resource and the operation (in brackets: the default).

| Shape | Workflows | Native now |
|---|---|---|
| openAi · text.(response) | 1568 | 1470 |
| openAi · text.message | 1093 | 1058 |
| agent · lm=lmChatOpenAi · mem=- · tools=- · parser=- | 1090 | 836 |
| anthropic · text.(message) | 944 | 894 |
| agent · lm=lmChatOpenAi · mem=- · tools=- · parser=outputParserStructured | 718 | 0 |
| chainLlm · lm=lmChatOpenAi · mem=- · tools=- · parser=- | 462 | 366 |
| agent · lm=lmChatOpenAi · mem=- · tools=yes · parser=- | 456 | 0 |
| agent · lm=lmChatAnthropic · mem=- · tools=- · parser=- | 454 | 0 |
| googleGemini · text.(message) | 410 | 371 |
| chainLlm · lm=lmChatAnthropic · mem=- · tools=- · parser=- | 371 | 0 |
| informationExtractor | 350 | 0 |
| agent · lm=lmChatAnthropic · mem=- · tools=- · parser=outputParserStructured | 282 | 0 |
| agent · lm=lmChatGoogleGemini · mem=- · tools=- · parser=- | 281 | 0 |
| textClassifier | 275 | 0 |
| agent · lm=lmChatOpenAi · mem=memoryBufferWindow · tools=yes · parser=- | 273 | 0 |
| agent · lm=lmChatOpenRouter · mem=- · tools=- · parser=- | 233 | 192 |
| anthropic · text.message | 221 | 194 |
| chainLlm · lm=lmChatGoogleGemini · mem=- · tools=- · parser=- | 192 | 0 |
| vectorStoreSupabase | 190 | 0 |
| chainLlm · lm=lmChatOpenAi · mem=- · tools=- · parser=outputParserStructured | 181 | 0 |
| chainLlm · lm=lmChatOpenRouter · mem=- · tools=- · parser=- | 168 | 140 |
| openAi · image.analyze | 150 | 0 |
| agent · lm=lmChatOpenAi · mem=- · tools=yes · parser=outputParserStructured | 141 | 0 |
| openAi · audio.transcribe | 134 | 0 |
| agent · lm=lmChatAnthropic · mem=- · tools=yes · parser=- | 134 | 0 |
| chainLlm · lm=lmChatAnthropic · mem=- · tools=- · parser=outputParserStructured | 130 | 0 |
| agent · lm=lmChatOpenAi · mem=memoryBufferWindow · tools=- · parser=- | 128 | 0 |
| googleGemini · document.(message) | 114 | 0 |
| agent · lm=lmChatOpenRouter · mem=- · tools=- · parser=outputParserStructured | 111 | 0 |
| agent · lm=lmChatGoogleGemini · mem=- · tools=- · parser=outputParserStructured | 101 | 0 |
| openAi · text.response | 98 | 96 |
| chainLlm · lm=lmChatOpenRouter · mem=- · tools=- · parser=outputParserStructured | 97 | 0 |
| agent · lm=lmChatAnthropic · mem=memoryBufferWindow · tools=yes · parser=- | 83 | 0 |
| chainLlm · lm=lmChatGoogleGemini · mem=- · tools=- · parser=outputParserStructured | 66 | 0 |
| googleGemini · image.analyze | 59 | 0 |
| agent · lm=lmChatOpenRouter · mem=- · tools=yes · parser=- | 57 | 0 |
| anthropic · document.(message) | 53 | 0 |
| agent · lm=lmChatGoogleGemini · mem=- · tools=yes · parser=- | 53 | 0 |
| openAi · image.(response) | 49 | 0 |
| agent · lm=lmChatOpenAi · mem=memoryPostgresChat · tools=yes · parser=- | 49 | 0 |
| vectorStoreInMemory | 45 | 0 |
| agent · lm=lmChatGoogleVertex · mem=- · tools=- · parser=- | 45 | 0 |
| agent · lm=lmChatGoogleGemini · mem=memoryBufferWindow · tools=yes · parser=- | 43 | 0 |
| agent · lm=lmChatAzureOpenAi · mem=- · tools=- · parser=- | 42 | 0 |
| agent · lm=lmChatOpenAi · mem=memoryBufferWindow · tools=- · parser=outputParserStructured | 41 | 0 |
| agent · lm=lmChatAnthropic · mem=memoryBufferWindow · tools=- · parser=- | 39 | 0 |
| agent · lm=lmChatAnthropic · mem=- · tools=yes · parser=outputParserStructured | 39 | 0 |
| agent · lm=lmChatAzureOpenAi · mem=- · tools=- · parser=outputParserStructured | 36 | 0 |
| googleGemini · image.(message) | 35 | 0 |
| chainLlm · lm=lmChatAzureOpenAi · mem=- · tools=- · parser=- | 34 | 0 |
| anthropic · image.(message) | 34 | 0 |
| openAi · assistant.(response) | 33 | 0 |
| agent · lm=- · mem=- · tools=- · parser=- | 31 | 0 |
| memoryManager | 30 | 0 |
| agent · lm=lmChatGoogleGemini · mem=memoryBufferWindow · tools=- · parser=- | 30 | 0 |
| guardrails | 29 | 0 |
| chainSummarization | 28 | 0 |
| googleGemini · text.message | 26 | 14 |
| openAi · file.(response) | 26 | 0 |
| agent · lm=lmChatAnthropic · mem=memoryBufferWindow · tools=yes · parser=outputParserStructured | 26 | 0 |
| agent · lm=lmChatOpenRouter · mem=memoryBufferWindow · tools=yes · parser=- | 25 | 0 |
| agent · lm=lmChatAwsBedrock · mem=- · tools=- · parser=- | 22 | 0 |
| agent · lm=lmChatOpenRouter · mem=- · tools=yes · parser=outputParserStructured | 22 | 0 |
| agent · lm=lmChatOpenAi · mem=memoryBufferWindow · tools=yes · parser=outputParserStructured | 21 | 0 |
| agent · lm=lmChatMistralCloud · mem=- · tools=- · parser=- | 20 | 0 |
| agent · lm=lmChatGroq · mem=- · tools=- · parser=- | 20 | 0 |

### Why a node is not native (first reason for each node)

`sub-nodes` means: more than the one chat model (a tool, a memory, an output parser, a
second model), or no model.

| Node and reason | Workflows |
|---|---|
| agent · sub-nodes | 2716 |
| chainLlm · sub-nodes | 586 |
| agent · model lmChatAnthropic | 397 |
| agent · agent version 1.7 | 396 |
| chainLlm · model lmChatAnthropic | 371 |
| agent · model lmChatGoogleGemini | 241 |
| agent · agent version 1.9 | 222 |
| chainLlm · model lmChatGoogleGemini | 180 |
| openAi · image.analyze · operation or parameter | 150 |
| agent · agent version 1.8 | 138 |
| openAi · audio.transcribe · operation or parameter | 134 |
| googleGemini · document.(message) · operation or parameter | 114 |
| openAi · text.(response) · operation or parameter | 90 |
| googleGemini · image.analyze · operation or parameter | 59 |
| chainLlm · model option responseFormat | 56 |
| anthropic · text.(message) · operation or parameter | 56 |
| anthropic · document.(message) · operation or parameter | 52 |
| agent · agent version 1.6 | 51 |
| openAi · image.(response) · operation or parameter | 49 |
| agent · output parser | 49 |
| agent · built-in tools | 45 |
| googleGemini · text.(message) · operation or parameter | 40 |
| openAi · text.(response) · has sub-nodes | 39 |
| openAi · text.message · has sub-nodes | 37 |
| agent · model lmChatGoogleVertex | 37 |
| googleGemini · image.(message) · operation or parameter | 35 |
| chainLlm · output parser | 34 |
| anthropic · image.(message) · operation or parameter | 34 |
| agent · model lmChatAzureOpenAi | 33 |
| chainLlm · model lmChatAzureOpenAi | 31 |
| openAi · assistant.(response) · operation or parameter | 31 |
| anthropic · text.message · operation or parameter | 30 |
| openAi · file.(response) · operation or parameter | 26 |
| agent · model lmChatAwsBedrock | 21 |
| agent · model lmChatGroq | 18 |
| agent · model option responseFormat | 18 |
| chainLlm · model lmChatAwsBedrock | 17 |
| openAi · audio.(response) · operation or parameter | 17 |
| googleGemini · video.analyze · operation or parameter | 16 |
| agent · model lmChatMistralCloud | 16 |
| agent · model lmChatDeepSeek | 16 |
| chainLlm · model lmChatDeepSeek | 15 |
| chainLlm · model lmChatGoogleVertex | 14 |
| googleGemini · image.edit · operation or parameter | 13 |
| chainLlm · model lmChatMistralCloud | 13 |
| googleGemini · text.message · operation or parameter | 12 |
| openAi · text.message · operation or parameter | 12 |
| chainLlm · model option textFormat | 11 |
| chainLlm · model lmChatGroq | 10 |
| googleGemini · audio.(message) · operation or parameter | 10 |
| agent · model option reasoningEffort | 10 |

### Cost of the native nodes

Executed bytecode instructions of the library node for one input item (a converted workflow
of a webhook and the node, less the 24 instructions of the webhook alone):

| Shape | Instructions |
|---|---|
| `openAi` `text.response` (version 2.1) | 703 |
| `openAi` `text.message` (version 1.8) | 332 |
| `anthropic` `text.message` | 278 |
| `agent` 3.1 with `lmChatOpenAi`, no tools | 534 |
| `chainLlm` 1.9 with `lmChatOpenAi` | 504 |

## Node types

| Node type | Workflows |
|---|---|
| `agent` | 5233 |
| `lmChatOpenAi` | 3775 |
| `openAi` | 3014 |
| `outputParserStructured` | 2260 |
| `chainLlm` | 1805 |
| `lmChatAnthropic` | 1769 |
| `anthropic` | 1246 |
| `lmChatGoogleGemini` | 966 |
| `memoryBufferWindow` | 812 |
| `lmChatOpenRouter` | 795 |
| `googleGemini` | 668 |
| `toolWorkflow` | 396 |
| `informationExtractor` | 350 |
| `tool: base.googleSheetsTool` | 319 |
| `embeddingsOpenAi` | 297 |
| `vectorStoreSupabase` | 289 |
| `chatTrigger` | 279 |
| `textClassifier` | 275 |
| `tool: base.gmailTool` | 229 |
| `documentDefaultDataLoader` | 203 |
| `lmChatAzureOpenAi` | 185 |
| `tool: base.googleCalendarTool` | 173 |
| `tool: base.httpRequestTool` | 135 |
| `memoryPostgresChat` | 129 |
| `toolThink` | 127 |
| `textSplitterRecursiveCharacterTextSplitter` | 100 |
| `mcpTrigger` | 96 |
| `lmChatGoogleVertex` | 92 |
| `toolCode` | 87 |
| `lmChatAwsBedrock` | 73 |
| `tool: base.slackTool` | 68 |
| `tool: base.dataTableTool` | 67 |
| `lmChatMistralCloud` | 65 |
| `lmChatDeepSeek` | 53 |
| `vectorStoreInMemory` | 52 |
| `tool: base.microsoftOutlookTool` | 52 |
| `tool: base.googleDocsTool` | 51 |
| `toolCalculator` | 50 |
| `tool: base.postgresTool` | 49 |
| `tool: base.perplexityTool` | 49 |
| `lmChatGroq` | 47 |
| `mcpClientTool` | 46 |
| `tool: base.notionTool` | 46 |
| `tool: base.supabaseTool` | 44 |
| `outputParserAutofixing` | 42 |
| `tool: base.airtableTool` | 40 |
| `toolHttpRequest` | 40 |
| `lmChatXAiGrok` | 36 |
| `tool: base.rssFeedReadTool` | 36 |
| `embeddingsGoogleGemini` | 33 |
| `tool: base.dateTimeTool` | 32 |
| `agentTool` | 31 |
| `memoryManager` | 30 |
| `guardrails` | 29 |
| `chainSummarization` | 28 |
| `tool: base.googleDriveTool` | 25 |
| `memoryRedisChat` | 22 |
| `toolVectorStore` | 21 |
| `tool: base.jiraTool` | 20 |
| `tool: base.telegramTool` | 20 |
| `tool: base.githubTool` | 19 |
| `rerankerCohere` | 19 |
| `tool: base.hubspotTool` | 17 |
| `tool: base.googleTasksTool` | 16 |
| `textSplitterCharacterTextSplitter` | 15 |
| `sentimentAnalysis` | 15 |
| `mcpClient` | 12 |
| `textSplitterTokenSplitter` | 11 |
| `modelSelector` | 11 |
| `tool: base.salesforceTool` | 11 |
| `tool: base.googleBigQueryTool` | 10 |
| `embeddingsAzureOpenAi` | 10 |
| `tool: base.clickUpTool` | 10 |

`tool: base.x` is a node of `n8n-nodes-base` that an AI node uses as a tool.

## Versions

| Node type and version | Workflows |
|---|---|
| `agent@3.1` | 2328 |
| `lmChatOpenAi@1.3` | 2212 |
| `outputParserStructured@1.3` | 1933 |
| `lmChatOpenAi@1.2` | 1493 |
| `anthropic@1` | 1242 |
| `openAi@1.8` | 1076 |
| `openAi@2.1` | 1013 |
| `agent@3` | 988 |
| `lmChatAnthropic@1.3` | 903 |
| `chainLlm@1.9` | 884 |
| `lmChatAnthropic@1.5` | 827 |
| `lmChatOpenRouter@1` | 795 |
| `agent@2.2` | 791 |
| `lmChatGoogleGemini@1` | 738 |
| `memoryBufferWindow@1.3` | 643 |
| `openAi@2.3` | 623 |
| `chainLlm@1.7` | 534 |
| `agent@1.7` | 396 |
| `agent@2` | 350 |
| `toolWorkflow@2.2` | 337 |
| `outputParserStructured@1.2` | 323 |
| `informationExtractor@1.2` | 303 |
| `googleGemini@1` | 290 |
| `embeddingsOpenAi@1.2` | 275 |
| `lmChatGoogleGemini@1.1` | 232 |
| `openAi@2` | 231 |
| `agent@1.9` | 222 |
| `textClassifier@1.1` | 214 |
| `vectorStoreSupabase@1.3` | 204 |
| `googleGemini@1.2` | 196 |
| `googleGemini@1.1` | 189 |
| `lmChatAzureOpenAi@1` | 185 |
| `memoryBufferWindow@1.4` | 157 |
| `chainLlm@1.5` | 154 |
| `chatTrigger@1.4` | 146 |
| `documentDefaultDataLoader@1.1` | 141 |
| `agent@1.8` | 138 |
| `chainLlm@1.4` | 131 |
| `lmChatOpenAi@1` | 126 |
| `agent@2.1` | 108 |
| `memoryPostgresChat@1.3` | 106 |
| `textSplitterRecursiveCharacterTextSplitter@1` | 100 |
| `chainLlm@1.6` | 99 |
| `lmChatGoogleVertex@1` | 92 |
| `toolThink@1.1` | 88 |
| `chatTrigger@1.1` | 84 |
| `mcpTrigger@2` | 77 |
| `toolCode@1.3` | 66 |
| `lmChatMistralCloud@1` | 65 |
| `documentDefaultDataLoader@1` | 62 |
| `lmChatAwsBedrock@1.1` | 61 |
| `textClassifier@1` | 61 |
| `openAi@1.7` | 57 |
| `vectorStoreSupabase@1` | 53 |
| `lmChatDeepSeek@1` | 53 |
| `agent@1.6` | 51 |
| `toolCalculator@1` | 50 |
| `chatTrigger@1.3` | 48 |
| `lmChatGroq@1` | 47 |
| `toolWorkflow@2` | 45 |
| `outputParserAutofixing@1` | 42 |
| `lmChatOpenAi@1.1` | 41 |
| `vectorStoreInMemory@1.3` | 40 |
| `toolHttpRequest@1.1` | 40 |
| `toolThink@1` | 40 |
| `informationExtractor@1` | 37 |
| `vectorStoreSupabase@1.1` | 36 |
| `lmChatXAiGrok@1` | 36 |
| `embeddingsGoogleGemini@1` | 33 |
| `lmChatAnthropic@1.2` | 30 |
| `memoryManager@1.1` | 30 |
| `embeddingsOpenAi@1` | 27 |
| `openAi@1.4` | 26 |
| `openAi@1` | 26 |
| `chainSummarization@2.1` | 22 |
| `openAi@1.3` | 20 |
| `memoryRedisChat@1.5` | 20 |
| `agentTool@2.2` | 20 |

## Combinations of a root node with its sub-nodes

Columns: the root, then the sub-node types on `ai_languageModel`, `ai_memory`, `ai_tool`, `ai_outputParser`, and the other AI connection types. `standalone` means a node without AI connections.

| Combination | Workflows |
|---|---|
| openAi · standalone | 2961 |
| anthropic · standalone | 1238 |
| agent(tools) · lm=lmChatOpenAi · mem=- · tools=- · parser=- · other=- | 1088 |
| agent(tools) · lm=lmChatOpenAi · mem=- · tools=- · parser=outputParserStructured · other=- | 718 |
| googleGemini · standalone | 665 |
| chainLlm · lm=lmChatOpenAi · mem=- · tools=- · parser=- · other=- | 462 |
| agent(tools) · lm=lmChatAnthropic · mem=- · tools=- · parser=- · other=- | 452 |
| chainLlm · lm=lmChatAnthropic · mem=- · tools=- · parser=- · other=- | 371 |
| agent(tools) · lm=lmChatAnthropic · mem=- · tools=- · parser=outputParserStructured · other=- | 281 |
| agent(tools) · lm=lmChatGoogleGemini · mem=- · tools=- · parser=- · other=- | 279 |
| chatTrigger · standalone | 264 |
| outputParserStructured · lm=lmChatOpenAi · mem=- · tools=- · parser=- · other=- | 241 |
| agent(tools) · lm=lmChatOpenRouter · mem=- · tools=- · parser=- · other=- | 233 |
| chainLlm · lm=lmChatGoogleGemini · mem=- · tools=- · parser=- · other=- | 192 |
| chainLlm · lm=lmChatOpenAi · mem=- · tools=- · parser=outputParserStructured · other=- | 181 |
| chainLlm · lm=lmChatOpenRouter · mem=- · tools=- · parser=- · other=- | 168 |
| textClassifier · lm=lmChatOpenAi · mem=- · tools=- · parser=- · other=- | 161 |
| vectorStoreSupabase · lm=- · mem=- · tools=- · parser=- · other=ai_embedding:embeddingsOpenAi | 155 |
| informationExtractor · lm=lmChatOpenAi · mem=- · tools=- · parser=- · other=- | 153 |
| chainLlm · lm=lmChatAnthropic · mem=- · tools=- · parser=outputParserStructured · other=- | 130 |
| outputParserStructured · lm=lmChatAnthropic · mem=- · tools=- · parser=- · other=- | 130 |
| vectorStoreSupabase · lm=- · mem=- · tools=- · parser=- · other=ai_document:documentDefaultDataLoader;ai_embedding:embeddingsOpenAi | 129 |
| agent(tools) · lm=lmChatOpenAi · mem=memoryBufferWindow · tools=- · parser=- · other=- | 126 |
| agent(tools) · lm=lmChatOpenRouter · mem=- · tools=- · parser=outputParserStructured · other=- | 111 |
| agent(tools) · lm=lmChatGoogleGemini · mem=- · tools=- · parser=outputParserStructured · other=- | 101 |
| documentDefaultDataLoader · lm=- · mem=- · tools=- · parser=- · other=ai_textSplitter:textSplitterRecursiveCharacterTextSplitter | 99 |
| informationExtractor · lm=lmChatAnthropic · mem=- · tools=- · parser=- · other=- | 99 |
| chainLlm · lm=lmChatOpenRouter · mem=- · tools=- · parser=outputParserStructured · other=- | 97 |
| lmChatOpenAi · standalone | 94 |
| outputParserStructured · lm=lmChatOpenRouter · mem=- · tools=- · parser=- · other=- | 94 |
| chainLlm · lm=lmChatGoogleGemini · mem=- · tools=- · parser=outputParserStructured · other=- | 66 |
| informationExtractor · lm=lmChatGoogleGemini · mem=- · tools=- · parser=- · other=- | 54 |
| agent(tools) · lm=lmChatOpenAi · mem=- · tools=base.googleSheetsTool · parser=- · other=- | 49 |
| outputParserStructured · standalone | 48 |
| agent(tools) · lm=lmChatOpenAi · mem=- · tools=toolWorkflow · parser=- · other=- | 48 |
| lmChatAnthropic · standalone | 47 |
| textClassifier · lm=lmChatAnthropic · mem=- · tools=- · parser=- · other=- | 46 |
| outputParserStructured · lm=lmChatGoogleGemini · mem=- · tools=- · parser=- · other=- | 46 |
| agent(tools) · lm=lmChatGoogleVertex · mem=- · tools=- · parser=- · other=- | 45 |
| agent(tools) · lm=lmChatAzureOpenAi · mem=- · tools=- · parser=- · other=- | 42 |
| agent(tools) · lm=lmChatOpenAi · mem=memoryBufferWindow · tools=- · parser=outputParserStructured · other=- | 41 |
| lmChatGoogleGemini · standalone | 40 |
| agent(tools) · lm=lmChatOpenAi · mem=memoryBufferWindow · tools=toolWorkflow · parser=- · other=- | 39 |
| agent(tools) · lm=lmChatAnthropic · mem=memoryBufferWindow · tools=- · parser=- · other=- | 39 |
| vectorStoreInMemory · lm=- · mem=- · tools=- · parser=- · other=ai_document:documentDefaultDataLoader;ai_embedding:embeddingsOpenAi | 36 |
| agent(tools) · lm=lmChatAzureOpenAi · mem=- · tools=- · parser=outputParserStructured · other=- | 36 |
| vectorStoreInMemory · lm=- · mem=- · tools=- · parser=- · other=ai_embedding:embeddingsOpenAi | 35 |
| chainLlm · lm=lmChatAzureOpenAi · mem=- · tools=- · parser=- · other=- | 34 |
| textClassifier · lm=lmChatOpenRouter · mem=- · tools=- · parser=- · other=- | 31 |
| agent · standalone | 31 |
| agent(tools) · lm=lmChatOpenAi · mem=memoryBufferWindow · tools=base.googleSheetsTool · parser=- · other=- | 31 |
| informationExtractor · lm=lmChatOpenRouter · mem=- · tools=- · parser=- · other=- | 30 |
| outputParserAutofixing · lm=lmChatOpenAi · mem=- · tools=- · parser=outputParserStructured · other=- | 28 |
| agent(tools) · lm=lmChatGoogleGemini · mem=memoryBufferWindow · tools=- · parser=- · other=- | 27 |
| agent(tools) · lm=lmChatOpenAi · mem=- · tools=base.gmailTool · parser=- · other=- | 27 |
| toolWorkflow · standalone | 25 |
| memoryBufferWindow · standalone | 24 |
| agent(tools) · lm=lmChatOpenAi · mem=- · tools=base.googleSheetsTool · parser=outputParserStructured · other=- | 23 |
| agent(tools) · lm=lmChatOpenAi · mem=memoryBufferWindow · tools=base.gmailTool · parser=- · other=- | 23 |
| textClassifier · lm=lmChatGoogleGemini · mem=- · tools=- · parser=- · other=- | 22 |
| agent(tools) · lm=lmChatAwsBedrock · mem=- · tools=- · parser=- · other=- | 22 |
| mcpTrigger · lm=- · mem=- · tools=base.googleCalendarTool · parser=- · other=- | 21 |
| agent(tools) · lm=lmChatAnthropic · mem=memoryBufferWindow · tools=toolWorkflow · parser=- · other=- | 21 |
| agent(tools) · lm=lmChatOpenAi · mem=- · tools=base.googleCalendarTool · parser=- · other=- | 20 |
| agent(tools) · lm=lmChatOpenAi · mem=- · tools=toolWorkflow · parser=outputParserStructured · other=- | 20 |
| agent(tools) · lm=lmChatGroq · mem=- · tools=- · parser=- · other=- | 20 |
| agent(tools) · lm=lmChatAnthropic · mem=memoryBufferWindow · tools=base.googleSheetsTool · parser=outputParserStructured · other=- | 20 |

## Chat model of each root

| Root and model | Workflows |
|---|---|
| agent(tools) · lm=lmChatOpenAi | 2750 |
| agent(tools) · lm=lmChatAnthropic | 1041 |
| chainLlm · lm=lmChatOpenAi | 626 |
| agent(tools) · lm=lmChatGoogleGemini | 521 |
| chainLlm · lm=lmChatAnthropic | 498 |
| agent(tools) · lm=lmChatOpenRouter | 457 |
| vectorStoreSupabase · lm=- | 288 |
| chainLlm · lm=lmChatOpenRouter | 259 |
| chainLlm · lm=lmChatGoogleGemini | 255 |
| outputParserStructured · lm=lmChatOpenAi | 241 |
| textClassifier · lm=lmChatOpenAi | 161 |
| informationExtractor · lm=lmChatOpenAi | 153 |
| outputParserStructured · lm=lmChatAnthropic | 130 |
| documentDefaultDataLoader · lm=- | 124 |
| agent(tools) · lm=lmChatAzureOpenAi | 122 |
| informationExtractor · lm=lmChatAnthropic | 99 |
| mcpTrigger · lm=- | 95 |
| outputParserStructured · lm=lmChatOpenRouter | 94 |
| openAi · lm=- | 78 |
| agent(tools) · lm=lmChatGoogleVertex | 67 |
| informationExtractor · lm=lmChatGoogleGemini | 54 |
| vectorStoreInMemory · lm=- | 52 |
| chainLlm · lm=lmChatAzureOpenAi | 49 |
| agent(tools) · lm=lmChatAwsBedrock | 48 |
| textClassifier · lm=lmChatAnthropic | 46 |
| outputParserStructured · lm=lmChatGoogleGemini | 46 |
| agent(tools) · lm=lmChatGoogleGemini+lmChatOpenAi | 39 |
| agent(tools) · lm=lmChatMistralCloud | 38 |
| agent(tools) · lm=lmChatAnthropic+lmChatOpenAi | 35 |
| textClassifier · lm=lmChatOpenRouter | 31 |
| informationExtractor · lm=lmChatOpenRouter | 30 |
| memoryManager · lm=- | 30 |
| outputParserAutofixing · lm=lmChatOpenAi | 28 |
| agent(tools) · lm=lmChatDeepSeek | 27 |
| agent(tools) · lm=lmChatGroq | 27 |
| chainLlm · lm=lmChatDeepSeek | 24 |
| chainLlm · lm=lmChatAwsBedrock | 23 |
| textClassifier · lm=lmChatGoogleGemini | 22 |
| chainLlm · lm=lmChatGoogleVertex | 20 |
| agent(tools) · lm=lmChatXAiGrok | 19 |
| toolVectorStore · lm=lmChatOpenAi | 18 |
| agentTool · lm=lmChatOpenAi | 17 |
| chainLlm · lm=lmChatMistralCloud | 16 |
| outputParserStructured · lm=lmChatAzureOpenAi | 15 |
| chatTrigger · lm=- | 15 |

## Sub-node types on each AI connection type

The count adds the workflows of each root type and sub-node version, so a workflow with two root types counts twice.

| Connection | Sub-node | Count |
|---|---|---|
| `ai_languageModel` | `lmChatOpenAi` | 4230 |
| `ai_outputParser` | `outputParserStructured` | 2254 |
| `ai_languageModel` | `lmChatAnthropic` | 1927 |
| `ai_languageModel` | `lmChatGoogleGemini` | 1005 |
| `ai_languageModel` | `lmChatOpenRouter` | 929 |
| `ai_memory` | `memoryBufferWindow` | 830 |
| `ai_tool` | `toolWorkflow` | 417 |
| `ai_tool` | `base.googleSheetsTool` | 331 |
| `ai_embedding` | `embeddingsOpenAi` | 301 |
| `ai_tool` | `base.gmailTool` | 237 |
| `ai_languageModel` | `lmChatAzureOpenAi` | 205 |
| `ai_document` | `documentDefaultDataLoader` | 203 |
| `ai_tool` | `base.googleCalendarTool` | 176 |
| `ai_tool` | `base.httpRequestTool` | 138 |
| `ai_tool` | `vectorStoreSupabase` | 132 |
| `ai_tool` | `toolThink` | 130 |
| `ai_memory` | `memoryPostgresChat` | 126 |
| `ai_textSplitter` | `textSplitterRecursiveCharacterTextSplitter` | 99 |
| `ai_languageModel` | `lmChatGoogleVertex` | 98 |
| `ai_tool` | `toolCode` | 88 |
| `ai_languageModel` | `lmChatAwsBedrock` | 80 |
| `ai_languageModel` | `lmChatMistralCloud` | 76 |
| `ai_tool` | `base.slackTool` | 72 |
| `ai_tool` | `base.dataTableTool` | 67 |
| `ai_languageModel` | `lmChatDeepSeek` | 58 |
| `ai_tool` | `base.microsoftOutlookTool` | 52 |
| `ai_tool` | `base.googleDocsTool` | 51 |
| `ai_tool` | `base.postgresTool` | 51 |
| `ai_tool` | `base.perplexityTool` | 51 |
| `ai_languageModel` | `lmChatGroq` | 48 |
| `ai_tool` | `toolCalculator` | 47 |
| `ai_tool` | `mcpClientTool` | 47 |
| `ai_tool` | `base.notionTool` | 46 |
| `ai_tool` | `base.supabaseTool` | 44 |
| `ai_outputParser` | `outputParserAutofixing` | 42 |
| `ai_tool` | `base.airtableTool` | 40 |
| `ai_tool` | `toolHttpRequest` | 39 |
| `ai_languageModel` | `lmChatXAiGrok` | 37 |
| `ai_tool` | `base.rssFeedReadTool` | 36 |
| `ai_tool` | `vectorStoreInMemory` | 34 |
| `ai_tool` | `base.dateTimeTool` | 32 |
| `ai_embedding` | `embeddingsGoogleGemini` | 31 |
| `ai_tool` | `agentTool` | 30 |
| `ai_vectorStore` | `vectorStoreSupabase` | 26 |
| `ai_tool` | `base.googleDriveTool` | 25 |
| `ai_memory` | `memoryRedisChat` | 23 |
| `ai_tool` | `toolVectorStore` | 21 |
| `ai_tool` | `base.telegramTool` | 20 |
| `ai_tool` | `base.githubTool` | 20 |
| `ai_tool` | `base.jiraTool` | 20 |
| `ai_reranker` | `rerankerCohere` | 19 |
| `ai_tool` | `base.hubspotTool` | 18 |
| `ai_tool` | `base.googleTasksTool` | 16 |
| `ai_textSplitter` | `textSplitterCharacterTextSplitter` | 15 |

## Modes and parameter names of the main node types

### `agent`

Modes (values of the mode parameters that the node sets):

| Mode | Workflows |
|---|---|
| `promptType=define` | 3193 |
| `promptType=define,hasOutputParser=true` | 1775 |
| `(defaults)` | 133 |
| `promptType=define,needsFallback=true` | 122 |
| `promptType=define,hasOutputParser=true,needsFallback=true` | 93 |
| `promptType=define,hasOutputParser=false` | 43 |
| `hasOutputParser=true` | 21 |
| `agent=conversationalAgent,promptType=define` | 11 |

Parameter names: `options` 5220, `text` 5099, `promptType` 5098, `options.systemMessage` 4037, `hasOutputParser` 1926, `options.maxIterations` 555, `needsFallback` 218, `options.returnIntermediateSteps` 185, `options.enableStreaming` 148, `options.passthroughBinaryImages` 74, `options.batching` 61, `agent` 19.

Node settings: retryOnFail=true 792, onError=continueRegularOutput 386, onError=continueErrorOutput 330, executeOnce=true 139, alwaysOutputData=true 131, continueOnFail=true 16.

### `chainLlm`

Modes (values of the mode parameters that the node sets):

| Mode | Workflows |
|---|---|
| `promptType=define` | 1173 |
| `promptType=define,hasOutputParser=true` | 533 |
| `promptType=define,needsFallback=true` | 52 |
| `promptType=define,hasOutputParser=true,needsFallback=true` | 43 |
| `(defaults)` | 36 |
| `promptType=define,hasOutputParser=false` | 20 |

Parameter names: `promptType` 1776, `text` 1775, `batching` 1308, `messages` 948, `messages.messageValues` 944, `hasOutputParser` 597, `needsFallback` 98, `batching.batchSize` 88, `batching.delayBetweenBatches` 79, `prompt` 14.

Node settings: retryOnFail=true 361, onError=continueRegularOutput 173, onError=continueErrorOutput 104, alwaysOutputData=true 51, executeOnce=true 45.

### `openAi`

Modes (values of the mode parameters that the node sets):

| Mode | Workflows |
|---|---|
| `(defaults)` | 2021 |
| `jsonOutput=true` | 411 |
| `simplify=false` | 190 |
| `resource=audio,operation=transcribe` | 134 |
| `resource=image,operation=analyze` | 103 |
| `simplify=false,jsonOutput=true` | 68 |
| `resource=text,operation=response,simplify=true` | 50 |
| `resource=image` | 49 |
| `resource=text,operation=response` | 39 |
| `resource=image,operation=analyze,simplify=false` | 38 |
| `resource=assistant` | 33 |
| `resource=file` | 26 |

Parameter names: `options` 3008, `modelId` 2851, `responses` 1665, `responses.values` 1665, `builtInTools` 1617, `messages` 1098, `messages.values` 1098, `resource` 508, `jsonOutput` 481, `options.temperature` 462, `options.textFormat` 426, `options.maxTokens` 404, `operation` 398, `simplify` 373, `text` 180, `inputType` 130, `options.instructions` 103, `binaryPropertyName` 101, `prompt` 95, `builtInTools.webSearch` 77, `options.reasoning` 69, `options.language` 44, `options.detail` 42, `options.size` 34, `assistantId` 34, `options.store` 31, `options.topP` 27, `options.quality` 27, `model` 27, `imageUrls` 23, `input` 17, `voice` 15, `images` 13, `options.purpose` 13, `options.reasoning_effort` 11.

Node settings: retryOnFail=true 430, onError=continueRegularOutput 204, onError=continueErrorOutput 125, executeOnce=true 94, alwaysOutputData=true 72, continueOnFail=true 18.

### `anthropic`

Modes (values of the mode parameters that the node sets):

| Mode | Workflows |
|---|---|
| `(defaults)` | 834 |
| `resource=text,operation=message,simplify=true` | 132 |
| `simplify=false` | 106 |
| `resource=text,operation=message` | 63 |
| `resource=document` | 47 |
| `resource=image` | 28 |
| `resource=text,operation=message,simplify=false` | 26 |

Parameter names: `modelId` 1246, `options` 1243, `messages` 1165, `messages.values` 1165, `options.maxTokens` 772, `options.system` 562, `resource` 311, `options.temperature` 307, `simplify` 293, `operation` 234, `options.includeMergedResponse` 128, `text` 86, `inputType` 80, `options.webSearch` 49, `binaryPropertyName` 48, `addAttachments` 32, `options.maxUses` 30, `attachmentsInputType` 21, `options.maxTokensToSample` 13.

Node settings: retryOnFail=true 205, onError=continueRegularOutput 142, onError=continueErrorOutput 64, executeOnce=true 47, alwaysOutputData=true 12.

### `googleGemini`

Modes (values of the mode parameters that the node sets):

| Mode | Workflows |
|---|---|
| `(defaults)` | 285 |
| `resource=document` | 92 |
| `jsonOutput=true` | 81 |
| `resource=image,operation=analyze` | 50 |
| `resource=image` | 35 |
| `simplify=false` | 30 |
| `simplify=false,jsonOutput=true` | 25 |
| `resource=document,simplify=false` | 23 |
| `resource=image,operation=edit` | 13 |

Parameter names: `modelId` 658, `options` 658, `messages` 436, `messages.values` 436, `resource` 275, `builtInTools` 266, `text` 188, `inputType` 183, `operation` 132, `jsonOutput` 124, `options.maxOutputTokens` 116, `simplify` 116, `options.systemMessage` 97, `options.temperature` 90, `binaryPropertyName` 65, `builtInTools.googleSearch` 50, `prompt` 49, `options.thinkingBudget` 37, `builtInTools.urlContext` 29, `builtInTools.codeExecution` 22, `options.includeMergedResponse` 18, `options.binaryPropertyOutput` 16, `imageUrls` 14, `images` 13.

Node settings: retryOnFail=true 260, onError=continueRegularOutput 84, onError=continueErrorOutput 63, alwaysOutputData=true 36, executeOnce=true 17.

### `lmChatOpenAi`

Modes (values of the mode parameters that the node sets):

| Mode | Workflows |
|---|---|
| `(defaults)` | 3775 |

Parameter names: `options` 3750, `model` 3732, `builtInTools` 1887, `options.temperature` 562, `responsesApiEnabled` 219, `options.maxTokens` 215, `options.timeout` 178, `options.reasoningEffort` 117, `options.responseFormat` 115, `builtInTools.webSearch` 104, `options.maxRetries` 94, `options.textFormat` 47, `options.topP` 34, `options.frequencyPenalty` 17, `builtInTools.codeInterpreter` 16, `options.presencePenalty` 15.

Node settings: retryOnFail=true 60.

### `lmChatAnthropic`

Modes (values of the mode parameters that the node sets):

| Mode | Workflows |
|---|---|
| `(defaults)` | 1768 |

Parameter names: `model` 1768, `options` 1748, `options.maxTokensToSample` 629, `options.temperature` 513, `options.thinking` 62, `options.thinkingMode` 35, `options.effort` 15, `options.thinkingBudget` 12.

Node settings: retryOnFail=true 33, onError=continueRegularOutput 12.

### `lmChatGoogleGemini`

Modes (values of the mode parameters that the node sets):

| Mode | Workflows |
|---|---|
| `(defaults)` | 966 |

Parameter names: `options` 960, `modelName` 592, `options.temperature` 214, `options.maxOutputTokens` 123, `options.topP` 16.

Node settings: retryOnFail=true 45.

### `lmChatOpenRouter`

Modes (values of the mode parameters that the node sets):

| Mode | Workflows |
|---|---|
| `(defaults)` | 795 |

Parameter names: `options` 793, `model` 654, `options.temperature` 215, `options.maxTokens` 91, `options.responseFormat` 62, `options.timeout` 37, `options.maxRetries` 37, `options.topP` 10.

Node settings: retryOnFail=true 33, alwaysOutputData=true 14, onError=continueRegularOutput 13.

### `outputParserStructured`

Modes (values of the mode parameters that the node sets):

| Mode | Workflows |
|---|---|
| `(defaults)` | 1243 |
| `schemaType=manual` | 918 |
| `schemaType=fromJson` | 133 |

Parameter names: `jsonSchemaExample` 1359, `schemaType` 1051, `inputSchema` 918, `autoFix` 563, `customizeRetryPrompt` 55, `prompt` 40, `jsonSchema` 17.

Node settings: retryOnFail=true 55, onError=continueRegularOutput 32, alwaysOutputData=true 13.

### `memoryBufferWindow`

Modes (values of the mode parameters that the node sets):

| Mode | Workflows |
|---|---|
| `sessionIdType=customKey` | 657 |
| `(defaults)` | 137 |
| `sessionIdType=<expr>` | 20 |

Parameter names: `sessionKey` 680, `sessionIdType` 678, `contextWindowLength` 469.

Node settings: none.

### `toolWorkflow`

Modes (values of the mode parameters that the node sets):

| Mode | Workflows |
|---|---|
| `(defaults)` | 367 |
| `source=database` | 20 |

Parameter names: `workflowId` 394, `workflowInputs` 374, `description` 367, `name` 80, `source` 23, `specifyInputSchema` 14, `schemaType` 12.

Node settings: none.

### `informationExtractor`

Modes (values of the mode parameters that the node sets):

| Mode | Workflows |
|---|---|
| `(defaults)` | 199 |
| `schemaType=manual` | 91 |
| `schemaType=fromJson` | 55 |
| `schemaType=fromAttributes` | 14 |

Parameter names: `text` 348, `options` 344, `attributes` 212, `options.systemPromptTemplate` 171, `schemaType` 159, `inputSchema` 91, `jsonSchemaExample` 55, `options.batching` 16.

Node settings: retryOnFail=true 57, onError=continueRegularOutput 29, onError=continueErrorOutput 17, alwaysOutputData=true 14.

### `textClassifier`

Modes (values of the mode parameters that the node sets):

| Mode | Workflows |
|---|---|
| `(defaults)` | 275 |

Parameter names: `options` 275, `inputText` 274, `categories` 274, `options.fallback` 113, `options.systemPromptTemplate` 110, `options.multiClass` 48, `options.enableAutoFixing` 47.

Node settings: retryOnFail=true 38, onError=continueErrorOutput 15, onError=continueRegularOutput 14.
