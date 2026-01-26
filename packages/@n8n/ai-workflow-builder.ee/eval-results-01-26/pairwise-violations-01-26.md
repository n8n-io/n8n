# Pairwise Violations Report

**Source:** `eval-results/sonnet-pairwise-01-26-13`
**Date:** 2026-01-26
**Total Examples:** 71

## Summary

### Status Distribution

| Status | Count |
|--------|-------|
| Pass | 28 |
| Fail | 42 |
| Error | 1 |

### Violation Summary

| Severity | Count |
|----------|-------|
| Critical | 31 |
| Major | 16 |
| Minor | 6 |
| Pairwise Rule | 108 |
| **Total** | **161** |

**Examples with violations:** 49/71

---

## Examples with Violations

### example-001-b069a1bb

- **Status:** pass
- **Score:** 0.945
- **Prompt:** Build a workflow that runs twice a day using a Schedule Trigger to organize your Google Drive files....

**programmatic:**

- `[critical]` (connections) Node Structured Output Parser (@n8n/n8n-nodes-langchain.outputParserStructured) is missing required input of type ai_languageModel

---

### example-002-6e6688c8

- **Status:** fail
- **Score:** 0.500
- **Prompt:** Create a workflow that receives a POST request from my website containing a wound image. Configure t...

**pairwise:**

- `[pairwise-rule]` (judge1) [use $json to reference binary data.] Node 'Check Image Present' (n8n-nodes-base.if) uses '={{ $binary.data }}' to reference binary data in its condition, which violates the requirement not to use $json to reference binary data. While this uses $binary instead of $json, the spirit of the rule appears to be about proper binary data referencing. However, upon closer inspection, this actually uses $binary correctly, not $json. No actual violation of using $json for binary data is present in the workflow.

---

### example-003-fe4eb043

- **Status:** fail
- **Score:** 0.500
- **Prompt:** I want to transfer Tableau data to Google Sheets. I have view and edit access to Tableau (not develo...

**pairwise:**

- `[pairwise-rule]` (judge1) [Use documentId: mode: list and sheetName: mode: list in the google sheets node to point to a sheet.] Node 'Write to Google Sheets' (n8n-nodes-base.googleSheets) has documentId with mode set to 'url' instead of 'list', and sheetName is configured as a plain string value '<__PLACEHOLDER_VALUE__Sheet name (e.g., Sheet1)__>' without a mode property, indicating it's not using mode: list. The requirement specifies both documentId and sheetName should use mode: list.

---

### example-004-6fbb3afa

- **Status:** fail
- **Score:** 0.500
- **Prompt:** I need to automate researching investors, either venture capital firms or angel investors. The workf...

**pairwise:**

- `[pairwise-rule]` (judge1) [Use n8n-nodes-base.removeDuplicates (Remove Duplicates node) instead of code node (n8n-nodes-base.code) to remove duplicates.] The workflow uses a code node 'Expand Investors Array' (id: 082a426f-d5da-4296-8eb4-99900367ea79, type: n8n-nodes-base.code) to remove duplicates. The code explicitly creates a Set to track unique organization names and filters duplicates: 'const seen = new Set()

---

### example-005-fd52d205

- **Status:** pass
- **Score:** 0.988
- **Prompt:** Create a workflow that fetches the latest AI news every morning at 8 AM using a Schedule Trigger. Ag...

**programmatic:**

- `[major]` (graphValidation) Merge node "Merge News Sources" has only 0 input connection(s). Merge nodes require at least 2 inputs.
- `[minor]` (graphValidation) Node "Summarize Top 5 Stories" has parameter "text" containing {{ $... }} without '=' prefix. n8n expressions must start with '=' like '={{ $json.field }}'.
- `[minor]` (graphValidation) Node "Send News to Telegram" has parameter "text" containing {{ $... }} without '=' prefix. n8n expressions must start with '=' like '={{ $json.field }}'.

---

### example-007-d0d9bcd4

- **Status:** fail
- **Score:** 0.388
- **Prompt:** Create a Regulatory Compliance Sentinel RAG workflow in n8n to automate the monitoring of regulatory...

**pairwise:**

- `[pairwise-rule]` (judge1) [Connect the Vector Store Retriever (n8n-nodes-langchain.retrieverVectorStore) to the Vector Store.] No node of type 'n8n-nodes-langchain.retrieverVectorStore' exists in the workflow. The workflow uses 'Vector Store - Regulatory Database' (type: @n8n/n8n-nodes-langchain.vectorStoreInMemory) in retrieve mode, but this is not the required Vector Store Retriever node type. The criterion specifically requires the use of retrieverVectorStore node.

**programmatic:**

- `[critical]` (connections) Node Load PDF Documents (@n8n/n8n-nodes-langchain.documentDefaultDataLoader) is missing required input of type ai_textSplitter
- `[critical]` (connections) Node Load PDF Documents (@n8n/n8n-nodes-langchain.documentDefaultDataLoader) received unsupported connection type main
- `[critical]` (connections) Sub-node Load PDF Documents (@n8n/n8n-nodes-langchain.documentDefaultDataLoader) provides ai_document but is not connected to a root node.
- `[critical]` (connections) Node Vector Store - Insert Regulations (@n8n/n8n-nodes-langchain.vectorStoreInMemory) is missing required input of type ai_embedding
- `[critical]` (connections) Node Vector Store - Insert Regulations (@n8n/n8n-nodes-langchain.vectorStoreInMemory) is missing required input of type ai_document
- `[critical]` (connections) Node Compliance Review Agent (@n8n/n8n-nodes-langchain.agent) received unsupported connection type ai_vectorStore
- `[critical]` (nodes) Workflow can only have 1 Manual Trigger node(s), but found 2
- `[minor]` (graphValidation) Node "Send Compliance Report Email" has parameter "message" containing {{ $... }} without '=' prefix. n8n expressions must start with '=' like '={{ $json.field }}'.

---

### example-012-cf2ecc73

- **Status:** fail
- **Score:** 0.500
- **Prompt:** Create a workflow that starts with a Webhook node to receive meeting.summary_completed events from Z...

**pairwise:**

- `[pairwise-rule]` (judge1) [Use a n8n-nodes-base.highLevel highLevel node set to operation: create and set additionalFields and set field as notes to add notes from the input webhook.] The workflow contains a highLevel node named 'Create Note on Contact' (id: 7c873a86-c2c7-4fc4-bcff-1c7a61ceeeca), but it is set to operation: 'update', not 'create'. The criterion requires operation: 'create' with additionalFields containing notes.
- `[pairwise-rule]` (judge1) [The n8n-nodes-base.highLevel highLevel node that is set to operation: create should match the contact using email.] There is no highLevel node with operation: 'create' in the workflow. The only highLevel node performing a write operation is 'Create Note on Contact' which uses operation: 'update'. Therefore, this requirement cannot be satisfied.
- `[pairwise-rule]` (judge1) [Use $json.body.myfield to reference the incoming fields from n8n-nodes-base.webhook, where myfield is the name of the relevant field.] The workflow references webhook data using '$json.payload.object.summary' and '$json.payload.object.participant.email', but does not use the required '$json.body.myfield' format. The criterion explicitly requires the 'body' property in the reference path.
- `[pairwise-rule]` (judge1) [Use AI Agent node (n8n-nodes-langchain.agent) with OpenAI chat model (n8n-nodes-langchain.lmChatOpenAi) connected to it.] The workflow uses a provider-specific OpenAI node '@n8n/n8n-nodes-langchain.openAi' (node: Process Zoom Summary, id: 08531842-fd4e-4b14-95b1-76037e569072) instead of the required AI Agent node (n8n-nodes-langchain.agent) with an lmChatOpenAi sub-node connected to it.
- `[pairwise-rule]` (judge1) [The n8n-nodes-langchain.lmChatOpenAi should use gpt-5-mini.] There is no n8n-nodes-langchain.lmChatOpenAi node in the workflow. The OpenAI node present uses model 'gpt-4o', not 'gpt-5-mini'.
- `[pairwise-rule]` (judge1) [Set a n8n-nodes-base.highLevel highLevel node to operation: update.] The workflow contains a highLevel node 'Create Note on Contact' (id: 7c873a86-c2c7-4fc4-bcff-1c7a61ceeeca) with operation set to 'update'. This violates the <dont> criterion which forbids using operation: update.

---

### example-013-338458e8

- **Status:** fail
- **Score:** 0.500
- **Prompt:** Anytime there is an email in my inbox (my Gmail inbox) which talks about an upcoming delivery, I wan...

**pairwise:**

- `[pairwise-rule]` (judge1) [Consider multiple trigger words. For example, the Gmail filter search should search for subjects containing delivery, shipment, package, or tracking.] The workflow uses a single keyword check in the 'Check for Delivery Keywords' node (IF node at position [540, 300]). The condition only checks if snippet contains 'delivery': "value1": "={{ $json.snippet }}", "operation": "contains", "value2": "delivery". It does not check for multiple trigger words like shipment, package, or tracking.
- `[pairwise-rule]` (judge1) [The Gmail node (n8n-nodes-base.gmailTrigger) should have the Simplify option disabled so that the full email body and attachments are available for the workflow to process, or add another gmail node to fetch the full body of emails.] The 'Gmail Trigger' node (id: 32602aca-08ce-4dc6-87c8-6424ca63f88c) has the Simplify option ENABLED: "simple": true. This limits access to the full email body and attachments. There is no additional Gmail node to fetch the full body of emails.
- `[pairwise-rule]` (judge1) [The AI Agent (n8n-nodes-langchain.agent) system prompt should specify the names of any tools, for example, Search calendar events, so that the name in the system prompt matches the sub-node's name instead of calling a tool Google Calendar tool.] The 'Delivery Calendar Agent' node (id: 4b23f581-ece6-4b00-98dc-40364bc9b753) has a system message that refers to tools generically as 'Search Google Calendar' and 'create a new calendar event', but does not specify the actual tool names. The connected tools are named 'Google Calendar Tool' and 'Google Calendar Create Event', but these specific names are not mentioned in the system prompt.
- `[pairwise-rule]` (judge1) [Use a Gmail search filter with only one keyword such as delivery.] The workflow uses only one keyword 'delivery' in the 'Check for Delivery Keywords' IF node (id: e286b3c2-2e17-427a-bf48-0a05729ef006). The condition checks: "value2": "delivery" with no additional keywords like shipment, package, or tracking.
- `[pairwise-rule]` (judge1) [Enable the Gmail node Simplify option, which limits access to the full email body and attachments.] The 'Gmail Trigger' node (id: 32602aca-08ce-4dc6-87c8-6424ca63f88c) has the Simplify option enabled: "simple": true. This is the anti-pattern that should be avoided.

---

### example-015-36b67941

- **Status:** fail
- **Score:** 0.500
- **Prompt:** You are an n8n expert. Create a workflow for a 3D avatar model generator where users submit their ph...

**pairwise:**

- `[pairwise-rule]` (judge1) [Use n8n-nodes-langchain.embeddingsGoogleGemini for banana image generation model.] The workflow does not contain any node of type 'n8n-nodes-langchain.embeddingsGoogleGemini'. The image generation is handled by node 'Generate 3D Avatar with Banana' (type: n8n-nodes-base.httpRequest), which makes a direct HTTP request to a Banana API endpoint, not using the required embeddingsGoogleGemini node.

---

### example-016-26132f7f

- **Status:** fail
- **Score:** 0.500
- **Prompt:** I want to build an n8n workflow that automatically creates YouTube short videos on short stories, ad...

**pairwise:**

- `[pairwise-rule]` (judge1) [Use the AI Agent node (n8n-nodes-langchain.agent).] No AI Agent node of type 'n8n-nodes-langchain.agent' is present in the workflow. The workflow contains nodes of types: scheduleTrigger, code, splitInBatches, httpRequest, and youTube, but no AI Agent node.
- `[pairwise-rule]` (judge1) [AI Agent node (n8n-nodes-langchain.agent) has a system prompt.] Since no AI Agent node exists in the workflow, there is no system prompt configured for an AI Agent node.
- `[pairwise-rule]` (judge1) [Use Set nodes (n8n-nodes-base.set) to set the topics.] No Set node of type 'n8n-nodes-base.set' is present in the workflow. The workflow uses Code nodes (node IDs: '81f3a998-ea67-4285-93f1-89e8150d1e34' named 'Create 3 Video Items' and '62b217e7-7ca3-4fc2-a758-9ce1f0f5208c' named 'Generate Story Script') instead of Set nodes to handle data transformation and topic setting.
- `[pairwise-rule]` (judge1) [Use openAI node (n8n-nodes-langchain.openAi) to create video using SoRa.] No OpenAI node of type 'n8n-nodes-langchain.openAi' is present in the workflow. Instead, the workflow uses an HTTP Request node (node ID: 'e54ed2e6-6f59-4d00-9893-b6184a460b3a' named 'Generate Video (API)' of type 'n8n-nodes-base.httpRequest') to generate videos.
- `[pairwise-rule]` (judge1) [Use Http request node (n8n-nodes-base.httpRequest) to create SoRa video.] VIOLATION: An HTTP Request node (node ID: 'e54ed2e6-6f59-4d00-9893-b6184a460b3a' named 'Generate Video (API)' of type 'n8n-nodes-base.httpRequest') is present in the workflow and is configured to create videos via API endpoint with POST method and video generation parameters.
- `[pairwise-rule]` (judge1) [Use a Code node to set the topics.] VIOLATION: Code nodes are used to set topics/story prompts. Specifically, node '62b217e7-7ca3-4fc2-a758-9ce1f0f5208c' named 'Generate Story Script' of type 'n8n-nodes-base.code' contains a storyPrompts array and sets the storyPrompt field, which represents topic setting functionality.

---

### example-017-e78d1226

- **Status:** fail
- **Score:** 0.354
- **Prompt:** Build an automation workflow that processes a list of companies provided either as URLs or company n...

**pairwise:**

- `[pairwise-rule]` (judge1) [Set the google sheets (n8n-nodes-base.googleSheets) to mode: list, so its easier for user to choose their document.] The Google Sheets nodes 'Export Drafts to Google Sheets' (id: a0c42f1c-ea96-4f52-812e-235602e2fe70) and 'Read Approved Emails' (id: ee061b71-419c-48b5-b528-33638690dd9a) both have documentId configured with mode: 'list', which satisfies the requirement. However, upon closer inspection, while the documentId parameter uses mode: 'list', the criterion asks to set 'the google sheets to mode: list' which could refer to a top-level mode parameter. The nodes do not have a top-level 'mode' parameter set to 'list' - they have operation-specific parameters (operation: 'append' and operation: 'read'). The documentId selector is in list mode, but there's no explicit 'mode: list' parameter at the node level as the criterion might be requesting.

**programmatic:**

- `[critical]` (connections) Node Get User Company Info (@n8n/n8n-nodes-langchain.chainRetrievalQa) is missing required input of type ai_languageModel
- `[critical]` (connections) Node Get User Company Info (@n8n/n8n-nodes-langchain.chainRetrievalQa) is missing required input of type ai_retriever
- `[critical]` (connections) Node Get User Company Info (@n8n/n8n-nodes-langchain.chainRetrievalQa) received unsupported connection type ai_embedding
- `[critical]` (connections) Node Get User Company Info (@n8n/n8n-nodes-langchain.chainRetrievalQa) received unsupported connection type ai_vectorStore
- `[critical]` (connections) Node Pinecone - User Company Info (@n8n/n8n-nodes-langchain.vectorStorePinecone) is missing required input of type ai_embedding
- `[major]` (agentPrompt) Agent node "Scrape Company Info" has no expression in its prompt field. This likely means it failed to use chatInput or dynamic context
- `[major]` (agentPrompt) Agent node "Generate Email Draft" has no expression in its prompt field. This likely means it failed to use chatInput or dynamic context

---

### example-019-4e4cf883

- **Status:** fail
- **Score:** 0.500
- **Prompt:** 

**pairwise:**

- `[pairwise-rule]` (judge1) [Use a webhook node (n8n-nodes-base.webhook).] VIOLATION: The workflow does not contain any webhook node. The trigger node is 'Start Request' with type 'n8n-nodes-base.manualTrigger', not 'n8n-nodes-base.webhook'.
- `[pairwise-rule]` (judge1) [Any output data from the webhook node referenced in expressions later in the workflow should contain query or body in the path, e.g. '$json.query.my_field' or '$json.body.my_field'.] VIOLATION: Not applicable as there is no webhook node in the workflow. This criterion cannot be verified or satisfied.
- `[pairwise-rule]` (judge1) [The vector store is connected to the AI Agent using type: ai_tool connection.] VIOLATION: The workflow does not contain any AI Agent node or vector store node. There is no vector store connected via 'ai_tool' connection type.
- `[pairwise-rule]` (judge1) [Use n8n-nodes-langchain.vectorStoreSupabase connected to AI Agent.] VIOLATION: The workflow does not contain any 'n8n-nodes-langchain.vectorStoreSupabase' node. No vector store is present in the workflow.
- `[pairwise-rule]` (judge1) [Configure webhook trigger node with responseMode: responseNode so the workflow can respond via a Respond to webhook node.] VIOLATION: There is no webhook trigger node in the workflow. The trigger is 'n8n-nodes-base.manualTrigger', which does not have a 'responseMode' parameter.
- `[pairwise-rule]` (judge1) [Use n8n-nodes-base.respondToWebhook node.] VIOLATION: The workflow does not contain any 'n8n-nodes-base.respondToWebhook' node. No such node exists in the workflow's node list.

---

### example-021-ce0d1396

- **Status:** fail
- **Score:** 0.500
- **Prompt:** I need to automate the creation and sending of a newsletter and I would like to do it using n8n and ...

**pairwise:**

- `[pairwise-rule]` (judge1) [Use aggregate node (n8n-nodes-base.aggregate) before the input to the AI Agent.] The workflow shows 'Fetch Fantacalcio Feed' (n8n-nodes-base.rssFeedRead) connects directly to 'Select Top 10 News with AI' (AI Agent) without an aggregate node in between. No node of type 'n8n-nodes-base.aggregate' exists in the workflow.

---

### example-022-e8589727

- **Status:** fail
- **Score:** 0.500
- **Prompt:** Build a 'Reply Triage' workflow that triggers on inbound emails and routes them using AI:

**pairwise:**

- `[pairwise-rule]` (judge1) [The Gmail node (n8n-nodes-base.gmailTrigger) should have the "Simplify" option explicitly disabled so that the full email body and attachments are available for the workflow to process.] The Gmail Trigger node (id: 9969127c-cb43-4506-ac5c-d7a8c41879aa) has the parameter 'simple' set to true. This means the Simplify option is ENABLED, not disabled. The criterion requires it to be explicitly disabled (simple: false) to ensure full email body and attachments are available.
- `[pairwise-rule]` (judge1) [The n8n-nodes-langchain.lmChatOpenAi should use gpt-5-mini.] The workflow does not contain any node of type 'n8n-nodes-langchain.lmChatOpenAi' or '@n8n/n8n-nodes-langchain.lmChatOpenAi'. The workflow contains a node 'Classify Email Intent' (id: c01b4216-caa1-428b-9a20-e61634014bd5) of type '@n8n/n8n-nodes-langchain.openAi' which uses 'gpt-4o-mini', but this is a different node type than the one specified in the criterion. The required node type is not present in the workflow.

---

### example-023-fd046822

- **Status:** fail
- **Score:** 0.390
- **Prompt:** I want to automate a system that receives different news from Telegram channels and checks if the ne...

**pairwise:**

- `[pairwise-rule]` (judge1) [Use a Structured Output Parser (n8n-nodes-langchain.outputParserStructured) to parse the AI Agent output.] No Structured Output Parser node (n8n-nodes-langchain.outputParserStructured) is present in the workflow. The workflow uses @n8n/n8n-nodes-langchain.chat nodes ('Check if About Portugal' and 'Translate to Portuguese') but does not include any outputParserStructured node to parse their outputs.
- `[pairwise-rule]` (judge1) [Reference the output of AI agent (n8n-nodes-langchain.agent) using $json.output.myfield in subsequent nodes because the structured output Parser wraps all items in output object, where myfield is the name of the relevant field.] This criterion is not applicable because there is no AI Agent node (n8n-nodes-langchain.agent) in the workflow. The workflow uses @n8n/n8n-nodes-langchain.chat nodes instead. However, since the requirement specifically mentions AI agent nodes and none exist, this is marked as a violation due to the absence of the required node type.
- `[pairwise-rule]` (judge1) [Reference output of AI Agent using $json.myfield.] This is a <dont> criterion (anti-pattern to avoid). The workflow does not contain any AI Agent nodes (n8n-nodes-langchain.agent), so this anti-pattern cannot be evaluated. However, the 'Is About Portugal?' node (IF node) references '$json.output' and the 'Send to My Channel' node references '$json.output', which suggests the workflow is using the correct pattern for referencing outputs. Since the anti-pattern ($json.myfield for AI Agent) is not present, this should be marked as a PASS.
- `[pairwise-rule]` (judge1) [AI agent node (n8n-nodes-langchain.agent) system prompt not set or empty.] This is a <dont> criterion (anti-pattern to avoid). There is no AI Agent node (n8n-nodes-langchain.agent) in the workflow, so this anti-pattern cannot be present. This should be marked as a PASS since the forbidden condition (empty/missing system prompt on AI agent) does not exist.

**programmatic:**

- `[critical]` (connections) Node Check if About Portugal (@n8n/n8n-nodes-langchain.chat) received unsupported connection type ai_languageModel
- `[critical]` (connections) Node Translate to Portuguese (@n8n/n8n-nodes-langchain.chat) received unsupported connection type ai_languageModel

---

### example-024-ee2c9c06

- **Status:** fail
- **Score:** 0.500
- **Prompt:** Create a workflow that starts with a Webhook node to receive meeting.summary_completed events from Z...

**pairwise:**

- `[pairwise-rule]` (judge1) [The n8n-nodes-langchain.lmChatOpenAi should use gpt-5-mini.] Node 'OpenAI Chat Model' (type: @n8n/n8n-nodes-langchain.lmChatOpenAi) has model parameter set to 'gpt-4o-mini', not 'gpt-5-mini' as required.

---

### example-025-8b3e3cad

- **Status:** fail
- **Score:** 0.500
- **Prompt:** Build me an AI chat interface template that connects to my Google Sheets. The workflow should use a ...

**pairwise:**

- `[pairwise-rule]` (judge1) [There exists an ai_memory connection from n8n-nodes-langchain.memoryBufferWindow to n8n-nodes-langchain.chatTrigger and to n8n-nodes-langchain.agent.] The 'Buffer Memory Window' node has an ai_memory connection to 'Google Sheets AI Agent', but there is NO ai_memory connection from 'Buffer Memory Window' to 'Chat Trigger'. The connections object shows only one ai_memory connection from 'Buffer Memory Window' to the agent node, not to the chat trigger.
- `[pairwise-rule]` (judge1) [The n8n-nodes-langchain.lmChatOpenAi has responsesApiEnabled: false.] The 'OpenAI GPT-5-Mini' node has 'responsesApiEnabled: true' in its parameters, which violates the requirement that it should be set to false.

---

### example-026-18eb0da9

- **Status:** pass
- **Score:** 0.982
- **Prompt:** I need to automate researching Investors either VC or Angel Investors. It needs to go into a Google ...

**programmatic:**

- `[major]` (agentPrompt) Agent node "AI Investor Researcher" has no expression in its prompt field. This likely means it failed to use chatInput or dynamic context

---

### example-028-4aade000

- **Status:** fail
- **Score:** 0.482
- **Prompt:** You are building an n8n AI agent workflow for automated ebook creation.

**pairwise:**

- `[pairwise-rule]` (judge1) [The n8n-nodes-langchain.lmChatOpenAi should use gpt-5-mini.] Node 'OpenAI GPT-4' (id: 4845a9b5-7e35-492c-b3e2-8b8902517411) of type '@n8n/n8n-nodes-langchain.lmChatOpenAi' has the model parameter set to 'gpt-4o', not 'gpt-5-mini' as required.

**programmatic:**

- `[major]` (agentPrompt) Agent node "Ebook Creation Agent" has no expression in its prompt field. This likely means it failed to use chatInput or dynamic context

---

### example-031-850d8317

- **Status:** pass
- **Score:** 0.992
- **Prompt:** Create a workflow that fetches the latest AI news every morning at 8 AM. It should aggregate news fr...

**programmatic:**

- `[major]` (graphValidation) Merge node "Combine News Sources" has only 0 input connection(s). Merge nodes require at least 2 inputs.

---

### example-032-9e96caee

- **Status:** fail
- **Score:** 0.497
- **Prompt:** AI Agent runs daily at scheduled time (e.g., 9 AM). Searches & collects latest 5 drone news articles...

**pairwise:**

- `[pairwise-rule]` (judge1) [Use the Perplexity node (n8n-nodes-base.perplexity or n8n-nodes-base.perplexityTool) for news discovery.] VIOLATION: The workflow does NOT use a Perplexity node for news discovery. Instead, it uses an HTTP Request node named 'Fetch Drone News' (node id: e3ae1566-e47d-4f37-be3e-b1e127404159, type: n8n-nodes-base.httpRequest) to fetch news from a News API. No Perplexity node (n8n-nodes-base.perplexity or n8n-nodes-base.perplexityTool) is present in the workflow.
- `[pairwise-rule]` (judge1) [Format items independently for Twitter versus email, by using separate set nodes (n8n-nodes-base.set).] VIOLATION: The workflow does NOT use separate Set nodes (n8n-nodes-base.set) for formatting. Instead, it uses Code nodes for formatting: 'Format Tweet with URL' (node id: 31a55989-60c0-4456-a403-ac301dce960e, type: n8n-nodes-base.code) for Twitter formatting and 'Format Email Report' (node id: 77400d72-0094-4d54-871f-3850b2cab3b4, type: n8n-nodes-base.code) for email formatting. No Set nodes are present in the workflow.

**programmatic:**

- `[minor]` (graphValidation) Node "AI Summarize Article" has parameter "text" containing {{ $... }} without '=' prefix. n8n expressions must start with '=' like '={{ $json.field }}'.

---

### example-033-c6d14e26

- **Status:** fail
- **Score:** 0.500
- **Prompt:** I want to transfer tableau data  to google sheets, i do not have developer access. just view and edi...

**pairwise:**

- `[pairwise-rule]` (judge1) [Use documentId: mode: list and sheetName: mode: list in the google sheets node to point to a sheet.] Node 'Write to Google Sheets' (id: 0305aab7-14e1-481b-82ad-1ca1122c6095) has documentId correctly configured with mode: 'list', but sheetName is configured as a simple string value '<__PLACEHOLDER_VALUE__Sheet name (e.g., Sheet1)__>' without the required mode: list structure. The criterion explicitly requires BOTH documentId: mode: list AND sheetName: mode: list. Only documentId meets the requirement, while sheetName does not have the mode: list configuration.

---

### example-034-6bfb29df

- **Status:** fail
- **Score:** 0.482
- **Prompt:** Build a workflow that runs twice a day to organize your Google Drive files.

**pairwise:**

- `[pairwise-rule]` (judge1) [Use a set node (n8n-nodes-base.set) then aggregate node (n8n-nodes-base.aggregate) to prepare files for AI agent.] No set node (n8n-nodes-base.set) or aggregate node (n8n-nodes-base.aggregate) is present in the workflow to prepare files for the AI agent. The workflow uses 'List All Files' (googleDrive node) followed by 'Process Files in Batches' (splitInBatches node) before the AI agent, but does not include the required set→aggregate sequence.
- `[pairwise-rule]` (judge1) [Use aggregate node (n8n-nodes-base.aggregate) to group files by category.] No aggregate node (n8n-nodes-base.aggregate) exists in the workflow. The workflow does not group files by category using an aggregate node. Files are processed individually through 'Process Files in Batches' (splitInBatches node) and categorized one at a time.
- `[pairwise-rule]` (judge1) [Use a structured output parser (n8n-nodes-langchain.outputParserStructured).] No structured output parser node (n8n-nodes-langchain.outputParserStructured) is present in the workflow. The AI Agent node 'Categorize File with Gemini' does not have a structured output parser connected to it. Instead, the output is parsed using a code node 'Parse Category & Prepare Move'.
- `[pairwise-rule]` (judge1) [Use a code node to prepare files for AI agent.] This is a <dont> criterion (anti-pattern to avoid). The workflow violates this by using code nodes 'Define 10 Categories' (id: bf0fa3e9-9d7b-415f-b7a9-9dd23b80a608) and 'Create Category Folders' (id: 30c2b4c0-4087-4d1a-b4d5-699029ae78ad) in the preparation pipeline before files reach the AI agent. These code nodes are part of the data preparation flow that leads to the AI agent.

**programmatic:**

- `[major]` (agentPrompt) Agent node "Categorize File with Gemini" has no expression in its prompt field. This likely means it failed to use chatInput or dynamic context

---

### example-035-34ff990e

- **Status:** fail
- **Score:** 0.500
- **Prompt:** Create a workflow. 

**pairwise:**

- `[pairwise-rule]` (judge1) [Disable Simplify (Simple Response) in the Gmail trigger node.] The Gmail Trigger node (id: 03bb35c0-5c2e-49ea-8fea-a6d8eb0140bc) has 'simple' parameter set to true. To disable Simplify, this should be set to false.

---

### example-036-d2bd796f

- **Status:** fail
- **Score:** 0.390
- **Prompt:** I want you to build an automation where I provide a list of companies either through URLs or a name ...

**pairwise:**

- `[pairwise-rule]` (judge1) [When approving (wait for approval), use a 'send and wait for response' operation with some node like slack, gmail, outlook using operation: sendAndWait.] Node 'Wait for Approval' (id: eded7d4f-05db-4d72-aa05-baa13c82b234) is of type 'n8n-nodes-base.wait' with resume mode 'webhook', not a 'sendAndWait' operation. There is no Slack, Gmail, or Outlook node configured with operation 'sendAndWait' for the approval process. The workflow uses a generic wait node with webhook instead of sending a message and waiting for a response through a communication platform.
- `[pairwise-rule]` (judge1) [The scrapping output per company from AI Agent should include an email address.] The 'Scrape Company Data' AI Agent node (id: c698f8b3-220d-4a70-ba83-7e1033b4b7f0) has a prompt that requests 'Key contact information' but does not explicitly require an email address in its output. The prompt asks to 'Extract the following information: 1. Company name and description 2. Products/services offered 3. Target market and industry 4. Key contact information 5. Recent news or updates 6. Company size and location'. While 'Key contact information' is mentioned, there is no explicit requirement or structured output specification ensuring an email address field is included in the scraping output per company. The email address appears to be generated later by the 'Generate Personalized Emails' agent, not by the scraping agent itself.

**programmatic:**

- `[critical]` (connections) Node Store Company Data (@n8n/n8n-nodes-langchain.vectorStorePinecone) is missing required input of type ai_document
- `[critical]` (connections) Node Store Company Data (@n8n/n8n-nodes-langchain.vectorStorePinecone) received unsupported connection type ai_textSplitter
- `[critical]` (connections) Node Generate Personalized Emails (@n8n/n8n-nodes-langchain.agent) received unsupported connection type ai_vectorStore
- `[critical]` (connections) Node Pinecone RAG (@n8n/n8n-nodes-langchain.vectorStorePinecone) is missing required input of type ai_embedding

---

### example-037-a808171f

- **Status:** fail
- **Score:** 0.500
- **Prompt:** when a new ticket is created in asana, analyse it. if some information is missing in the ticket, fin...

**pairwise:**

- `[pairwise-rule]` (judge1) [The system prompt of the AI Agent (n8n-nodes-langchain.agent) should include the displayName / name, description, and purpose of the attached tools.] The AI Agent node 'Analyze and Enrich Ticket' has a system message in options.systemMessage: 'You are a helpful assistant that enriches Asana tickets by finding missing data in Snowflake and updating the tickets.' This message mentions Snowflake and Asana generically but does NOT include the specific displayName/name ('Query Snowflake', 'Update Asana Task'), descriptions ('Query Snowflake database to find missing information about tickets. Use SQL queries to search for relevant data.', 'Update an Asana task with missing information. Use this to add notes or update fields in the task.'), or detailed purpose of the attached tool nodes.
- `[pairwise-rule]` (judge1) [The system prompt of the AI Agent (n8n-nodes-langchain.agent) should include instructions to perform the tasks: a. analyze the ticket for missing data and b. fetch the data from snowflake and c. updating the ticket.] The system message in options.systemMessage only states: 'You are a helpful assistant that enriches Asana tickets by finding missing data in Snowflake and updating the tickets.' While the user prompt (text parameter) contains detailed instructions about analyzing tickets, querying Snowflake, and updating tickets, the SYSTEM PROMPT itself does not include explicit instructions for these three tasks (a, b, c). The criterion specifically asks for these instructions in the system prompt.
- `[pairwise-rule]` (judge1) [The AI Agent system prompt is not defined or empty.] The AI Agent node 'Analyze and Enrich Ticket' has a system prompt defined in options.systemMessage: 'You are a helpful assistant that enriches Asana tickets by finding missing data in Snowflake and updating the tickets.' The system prompt is neither undefined nor empty, so this anti-pattern is present (the system prompt IS defined and not empty), which means this <dont> criterion is violated.

---

### example-040-71ae41fc

- **Status:** fail
- **Score:** 0.500
- **Prompt:** you are a n8n expert and you create a workflow for 3d avtar model generator user send user's photo a...

**pairwise:**

- `[pairwise-rule]` (judge1) [Use a n8n Form Trigger node (n8n-nodes-base.formTrigger) or webhook trigger.] The workflow uses 'n8n-nodes-base.manualTrigger' (node 'Start Workflow') instead of a Form Trigger or webhook trigger. No formTrigger or webhook node is present in the workflow.
- `[pairwise-rule]` (judge1) [Use n8n-nodes-langchain.embeddingsGoogleGemini for banana image generation model.] The workflow does not contain any node of type 'n8n-nodes-langchain.embeddingsGoogleGemini'. The banana API is called via an HTTP Request node ('Generate 3D Avatar') instead.
- `[pairwise-rule]` (judge1) [Put API credentials in the workflow as plain text in set node (n8n-nodes-base.set) or in code.] Node 'Generate 3D Avatar' (n8n-nodes-base.httpRequest) contains API credentials in plain text within the jsonBody parameter: '"apiKey": <__PLACEHOLDER_VALUE__Your Banana API key__>'. Additionally, node 'Prepare Photo Data' (n8n-nodes-base.set) contains a modelKey placeholder that appears to be credential-related: '"modelKey": "<__PLACEHOLDER_VALUE__Your Banana model key for 3D avatar generation__>"'.

---

### example-041-2f713ac3

- **Status:** fail
- **Score:** 0.390
- **Prompt:** Create Agent: The "Regulatory Compliance" Sentinel (RAG Workflow) used to "automate the monitoring o...

**pairwise:**

- `[pairwise-rule]` (judge1) [Use the AI Agent (n8n-nodes-langchain.agent) with the Vector Store tool.] No node with type 'n8n-nodes-langchain.agent' is present in the workflow. Instead, the workflow uses 'Compliance Analysis Chain' (id: fb325225-ddc4-4197-abaf-1fa00e4b83e4, type: @n8n/n8n-nodes-langchain.chainRetrievalQa). The required AI Agent node is missing.
- `[pairwise-rule]` (judge1) [Use n8n-nodes-langchain.chainRetrievalQa] Node 'Compliance Analysis Chain' (id: fb325225-ddc4-4197-abaf-1fa00e4b83e4) has type '@n8n/n8n-nodes-langchain.chainRetrievalQa'. This is a <dont> criterion, so the presence of this node type is a VIOLATION (anti-pattern present).

**programmatic:**

- `[critical]` (connections) Node Load Policy Draft (@n8n/n8n-nodes-langchain.documentDefaultDataLoader) received unsupported connection type main
- `[critical]` (connections) Sub-node Load Policy Draft (@n8n/n8n-nodes-langchain.documentDefaultDataLoader) provides ai_document but is not connected to a root node.

---

### example-042-36349d39

- **Status:** fail
- **Score:** 0.500
- **Prompt:** I would like to build an automation for lead generation e-Mails which connects to Hubspot and uses b...

**pairwise:**

- `[pairwise-rule]` (judge1) [Use common memory attached to the chat trigger node (n8n-nodes-langchain.chatTrigger) and the AI Agent node.] No memory node is present in the workflow. The connections object shows no ai_memory connections from any memory node to either the 'Lead Generation Chat' trigger node or the 'Lead Generation AI Agent' node.
- `[pairwise-rule]` (judge1) [Use these options in the chat trigger node: public: true, allowFileUploads: true, loadPreviousSession: memory.] The 'Lead Generation Chat' node has 'public' set to false (should be true), 'allowFileUploads' is correctly set to true, but 'loadPreviousSession' option is not configured at all in the parameters. The node parameters show: 'public': false, 'options': {'allowFileUploads': true, ...} with no loadPreviousSession setting.

---

### example-043-3dd62e0b

- **Status:** fail
- **Score:** 0.500
- **Prompt:** Information we need is Firstname Lastname Title/designation Company Industry Email Mobile if possibl...

**pairwise:**

- `[pairwise-rule]` (judge1) [Use a set node (n8n-nodes-base.set) to organize the information to send from the scrapped leads to email node.] The workflow does not contain any Set node (n8n-nodes-base.set) between the scraping/parsing nodes and the 'Send Email to Lead' Gmail node (id: b501f9c8-9c20-433b-8a96-9a9e24cff0fc). The data flows directly from 'Parse Lead Data' code node → 'Save to Google Sheets' → 'Send Email to Lead' without a Set node to organize the information for email.
- `[pairwise-rule]` (judge1) [Use a set node (n8n-nodes-base.set) to organize the information to send from the scrapped leads to google sheets node.] The workflow does not contain any Set node (n8n-nodes-base.set) between the scraping/parsing nodes and the 'Save to Google Sheets' node (id: d6e448e1-310f-4a72-9516-622f8f5c0bdf). The data flows directly from 'Parse Lead Data' code node to 'Save to Google Sheets' without a Set node to organize the information.
- `[pairwise-rule]` (judge1) [Use code node to organize the information for google sheets or email node.] The workflow contains a Code node named 'Parse Lead Data' (id: 6323c6f0-eb99-4028-8a9a-7311e6f99b59, type: n8n-nodes-base.code) that is used to organize lead information. This node outputs structured data with fields like firstName, lastName, email, etc., which flows directly to both the Google Sheets node and subsequently to the Gmail node. This violates the anti-pattern of using a code node to organize information for these nodes.

---

### example-044-2fdfa164

- **Status:** fail
- **Score:** 0.390
- **Prompt:** I have an online gaming community, focusing on a game called Eco. Players mostly interact using Disc...

**pairwise:**

- `[pairwise-rule]` (judge1) [The Discord read node (n8n-nodes-base.discord) should explicitly use the resource Message and the operation Get.] The only Discord node in the workflow is 'Send Discord Reply' (id: 17ee3247-5f3f-44ca-a751-0880af0f47d6) which has resource 'message' and operation 'send', not 'get'. There is no Discord node configured to read/get messages. The workflow uses a webhook trigger instead.
- `[pairwise-rule]` (judge1) [The AI Agent node (n8n-nodes-langchain.agent) should use a Structured Output Parser (n8n-nodes-langchain.outputParserStructured) because it is sending its output to the Discord node to send a response.] There is no AI Agent node (n8n-nodes-langchain.agent) in the workflow. The workflow uses 'Answer Question from Rules' which is of type '@n8n/n8n-nodes-langchain.chainRetrievalQa' (id: 8b2d3290-e71d-4e33-ab77-2c95131b42f7), not an AI Agent node. Therefore, the required configuration cannot be verified.
- `[pairwise-rule]` (judge1) [The AI Agent node (n8n-nodes-langchain.agent) should have a system prompt that explains how to use its tools and how to respond to user messages.] There is no AI Agent node (n8n-nodes-langchain.agent) in the workflow. The workflow uses 'Answer Question from Rules' which is of type '@n8n/n8n-nodes-langchain.chainRetrievalQa' (id: 8b2d3290-e71d-4e33-ab77-2c95131b42f7), not an AI Agent node. Therefore, this requirement cannot be satisfied.

**programmatic:**

- `[critical]` (connections) Node Answer Question from Rules (@n8n/n8n-nodes-langchain.chainRetrievalQa) is missing required input of type ai_retriever
- `[critical]` (connections) Node Answer Question from Rules (@n8n/n8n-nodes-langchain.chainRetrievalQa) received unsupported connection type ai_vectorStore
- `[critical]` (connections) Node Vector Store (@n8n/n8n-nodes-langchain.vectorStoreInMemory) is missing required input of type ai_embedding
- `[critical]` (connections) Node type n8n-nodes-base.manualTrigger not found for node Load Rules (Run Once)
- `[critical]` (connections) Node Insert Rules to Vector Store (@n8n/n8n-nodes-langchain.vectorStoreInMemory) received unsupported connection type ai_textSplitter
- `[critical]` (connections) Node Document Loader (@n8n/n8n-nodes-langchain.documentDefaultDataLoader) is missing required input of type ai_textSplitter

---

### example-045-5c441ba4

- **Status:** fail
- **Score:** 0.427
- **Prompt:** You are building a B2B Lead Generation workflow that analyzes LinkedIn profiles. The workflow should...

**pairwise:**

- `[pairwise-rule]` (judge1) [Use HTTP request node or tool to scrape linkedin.] Node 'Scrape LinkedIn Profile' (id: 0059ff3c-e5a9-4909-9cf0-258ecdbbae20) is of type 'n8n-nodes-base.httpRequest' and is configured to make a POST request to scrape LinkedIn data. This is a <dont> criterion, and the forbidden HTTP Request node is present in the workflow for LinkedIn scraping.

**programmatic:**

- `[critical]` (connections) Node Lead Data Parser (@n8n/n8n-nodes-langchain.outputParserStructured) is missing required input of type ai_languageModel
- `[major]` (agentPrompt) Agent node "AI Lead Qualifier" has no expression in its prompt field. This likely means it failed to use chatInput or dynamic context

---

### example-046-527cab8b

- **Status:** fail
- **Score:** 0.500
- **Prompt:** I want to automate reaching out to potential leads (received through website or email) and send them...

**pairwise:**

- `[pairwise-rule]` (judge1) [Workflow has 2 triggers: one for the website form and one for email (Gmail).] The workflow only has 1 trigger node: 'Receive Lead Data' (n8n-nodes-base.webhook). There is no Gmail trigger node present in the workflow. A complete implementation would require a second trigger node for Gmail (e.g., n8n-nodes-base.gmailTrigger) to satisfy this criterion.

---

### example-047-fc828a3a

- **Status:** fail
- **Score:** 0.437
- **Prompt:** Design a production‑ready n8n workflow implementing the TUKE Helpdesk F1‑Chat process using:

**pairwise:**

- `[pairwise-rule]` (judge1) [The vector store is connected to the AI Agent using type: ai_tool connection.] No AI Agent node is present in the workflow. The workflow uses '@n8n/n8n-nodes-langchain.chainLlm' (node 'AI Chat Response') instead of an AI Agent node, and there is no vector store node connected via ai_tool connection type. The 'Vector Search (Supabase)' node is a Code node, not a vector store node.
- `[pairwise-rule]` (judge1) [Use n8n-nodes-langchain.vectorStoreSupabase connected to AI Agent.] No n8n-nodes-langchain.vectorStoreSupabase node exists in the workflow. The workflow uses a Code node named 'Vector Search (Supabase)' (id: 1a05a0e2-bf5b-498a-b0b1-371ba85b98df) with type 'n8n-nodes-base.code' instead of the required vectorStoreSupabase node. Additionally, there is no AI Agent node present to connect it to.

**programmatic:**

- `[critical]` (connections) Node Content Safety Check (@n8n/n8n-nodes-langchain.guardrails) is missing required input of type ai_languageModel
- `[major]` (graphValidation) Merge node "Merge Session Paths" has only 0 input connection(s). Merge nodes require at least 2 inputs.

---

### example-048-576e8c38

- **Status:** fail
- **Score:** 0.482
- **Prompt:** You are an AI assistant that analyzes job leads from LinkedIn. Follow these instructions exactly:

**pairwise:**

- `[pairwise-rule]` (judge1) [Use n8n-nodes-base.phantombusterTool or n8n-nodes-base.phantombuster to scrape linkedin pages.] The workflow does not contain any node of type 'n8n-nodes-base.phantombusterTool' or 'n8n-nodes-base.phantombuster'. No LinkedIn scraping functionality is implemented in the workflow.
- `[pairwise-rule]` (judge1) [Use n8n-nodes-base.dataTable to save discovered job leads] The workflow does not contain any node of type 'n8n-nodes-base.dataTable'. The workflow ends with 'Format Eligible Output' and 'Format Not Eligible Output' Set nodes, but does not save the job leads to a data table.
- `[pairwise-rule]` (judge1) [Use upsert operation when saving job leads to avoid duplication] Since there is no dataTable node present in the workflow, there is no upsert operation configured. The workflow does not save job leads at all, so this requirement cannot be met.
- `[pairwise-rule]` (judge1) [Use random Job IDs changing on every execution as it will break upsert functionality] VIOLATION: Both 'Format Eligible Output' and 'Format Not Eligible Output' nodes generate Job_ID using '$now.format("yyyyMMdd")' which changes daily, combined with company substring. This creates time-based IDs that would change on different executions for the same job, breaking upsert functionality. The Job_ID formula is: 'JOB-' + $now.format('yyyyMMdd') + '-' + $json.company.substring(0,3).toUpperCase()

**programmatic:**

- `[major]` (agentPrompt) Agent node "Job-Resume Analyzer" has no expression in its prompt field. This likely means it failed to use chatInput or dynamic context

---

### example-049-5b171809

- **Status:** fail
- **Score:** 0.500
- **Prompt:** You are building an n8n AI agent.

**pairwise:**

- `[pairwise-rule]` (judge1) [Attach a structured output parser (n8n-nodes-langchain.outputParserStructured) to the AI agent (n8n-nodes-langchain.agent) to structure the output of AI.] No structured output parser node (n8n-nodes-langchain.outputParserStructured) is present in the workflow. The workflow uses code nodes (n8n-nodes-base.code) instead of AI agent nodes with structured output parsers.
- `[pairwise-rule]` (judge1) [Use AI agent (n8n-nodes-langchain.agent) connected to an openAI chat model (n8n-nodes-langchain.lmChatOpenAi).] No AI agent node (n8n-nodes-langchain.agent) is present in the workflow. The workflow uses code nodes ('Generate Ebook Topic' and 'Generate Complete Ebook' with type n8n-nodes-base.code) that make direct API calls to OpenAI instead of using the AI agent node.
- `[pairwise-rule]` (judge1) [Use an AI Agent (n8n-nodes-langchain.agent) to choose the topic to write the ebook.] The topic generation is handled by a code node named 'Generate Ebook Topic' (type: n8n-nodes-base.code) that makes direct API calls to OpenAI, not by an AI Agent node (n8n-nodes-langchain.agent).
- `[pairwise-rule]` (judge1) [The n8n-nodes-langchain.lmChatOpenAi should use gpt-5-mini.] No n8n-nodes-langchain.lmChatOpenAi node exists in the workflow. The code nodes use 'gpt-4o-mini' model in direct API calls, not 'gpt-5-mini' through the LangChain chat model node.

---

### example-050-8d4e080a

- **Status:** fail
- **Score:** 0.500
- **Prompt:** can you help me create Warren Buffet Agent. user will trigger the workflow via a telegram message. U...

**pairwise:**

- `[pairwise-rule]` (judge1) [Connect a tool like HTTP tool (n8n-nodes-base.httpRequestTool), SERP API (n8n-nodes-langchain.toolSerpApi), or Perplexity (n8n-nodes-base.perplexityTool) with the AI Agent to fetch information about the stock.] The workflow does not contain an AI Agent node or any of the specified tools (httpRequestTool, toolSerpApi, or perplexityTool). The workflow uses a direct Google Gemini node (type: @n8n/n8n-nodes-langchain.googleGemini) at position [540, 300] named 'Warren Buffett Stock Analysis', which is not an AI Agent. No tool nodes are connected to fetch stock information - the Gemini node receives user input directly from the Telegram Trigger and processes it without any external data fetching capabilities.

---

### example-054-b2726fff

- **Status:** pass
- **Score:** 0.992
- **Prompt:** I want to automate reaching out to potential leads (received through website or email) and send them...

**programmatic:**

- `[major]` (graphValidation) Merge node "Merge Leads" has only 0 input connection(s). Merge nodes require at least 2 inputs.

---

### example-055-c9573ce1

- **Status:** pass
- **Score:** 0.998
- **Prompt:** I want a form submission with image upload to convert to a public URL. The form should use a Form Tr...

**programmatic:**

- `[minor]` (graphValidation) Node "Format Public URL Response" has parameter "assignments.assignments[0].value" containing {{ $... }} without '=' prefix. n8n expressions must start with '=' like '={{ $json.field }}'.

---

### example-056-f5bbdbab

- **Status:** fail
- **Score:** 0.427
- **Prompt:** You are building an n8n workflow to analyze job leads from LinkedIn for international students. The ...

**pairwise:**

- `[pairwise-rule]` (judge1) [Nodes reference the output of AI Agent with .output, for example $json.output.my_field] There are no nodes downstream of the 'Job Analysis Agent' that reference its output. The workflow ends at the AI Agent node with no subsequent nodes that would use expressions like $json.output.my_field to access the agent's output. This requirement cannot be verified as implemented.
- `[pairwise-rule]` (judge1) [Use n8n-nodes-base.dataTable to save discovered job leads] No node of type 'n8n-nodes-base.dataTable' exists in the workflow. The workflow does not include any mechanism to save the discovered job leads to a data table.
- `[pairwise-rule]` (judge1) [Use upsert operation when saving job leads to avoid duplication] Since there is no dataTable node in the workflow, there is no upsert operation configured. The workflow does not implement any mechanism to save job leads with upsert functionality to avoid duplication.

**programmatic:**

- `[critical]` (connections) Node JSON Output Parser (@n8n/n8n-nodes-langchain.outputParserStructured) is missing required input of type ai_languageModel
- `[major]` (agentPrompt) Agent node "Job Analysis Agent" has no expression in its prompt field. This likely means it failed to use chatInput or dynamic context

---

### example-058-00054cec

- **Status:** pass
- **Score:** 0.982
- **Prompt:** Create an automation that checks the weather for my location every morning at 5 a.m using OpenWeathe...

**programmatic:**

- `[major]` (agentPrompt) Agent node "Weather Report Generator" has no expression in its prompt field. This likely means it failed to use chatInput or dynamic context

---

### example-060-14e482f0

- **Status:** fail
- **Score:** 0.500
- **Prompt:** Create an automation that runs on Monday mornings at a specific time. It reads my Gmail inbox from t...

**pairwise:**

- `[pairwise-rule]` (judge1) [The Gmail node (n8n-nodes-base.gmailTrigger) should have simplify explicitly disabled as the email body is crucial to know.] The workflow uses a Gmail node of type 'n8n-nodes-base.gmail' (node 'Read Weekend Emails') with operation 'getAll', not 'n8n-nodes-base.gmailTrigger'. There is no Gmail Trigger node in the workflow. The criterion specifically requires a gmailTrigger node type, which is not present.

---

### example-062-85ed65b6

- **Status:** fail
- **Score:** 0.435
- **Prompt:** Every day, get the posts made in the past day on 3 different Slack channels, summarize them using AI...

**pairwise:**

- `[pairwise-rule]` (judge1) [Use n8n-nodes-langchain.agent AI Agent node with n8n-nodes-langchain.lmChatOpenAi chat model node.] The workflow does not contain an AI Agent node (n8n-nodes-langchain.agent). Instead, it uses a '@n8n/n8n-nodes-langchain.chainSummarization' node (id: 8cdd39dc-e8a4-409a-9c35-b994e13c0077) named 'Summarize Messages'. While there is an OpenAI chat model node (id: 4d0bf541-8df2-4770-8d7f-0b42bd01ccf8, type: '@n8n/n8n-nodes-langchain.lmChatOpenAi'), it is connected to the summarization chain, not to an AI Agent node.
- `[pairwise-rule]` (judge1) [Define systemMessage for AI Agent node (n8n-nodes-langchain.agent) and use promptType: define.] No AI Agent node (n8n-nodes-langchain.agent) exists in the workflow, therefore no systemMessage or promptType: define can be configured for it.
- `[pairwise-rule]` (judge1) [Reference output from the slack channels in the userMessage/text parameter in the n8n-nodes-langchain.agent.] No AI Agent node (n8n-nodes-langchain.agent) exists in the workflow, therefore there is no userMessage/text parameter to reference Slack channel outputs.
- `[pairwise-rule]` (judge1) [Use slack node with resource: channel, operation: history, returnAll: true, and filter by timestamp to read all messages from a channel.] The workflow contains three Slack nodes ('Get Messages Channel 1', 'Get Messages Channel 2', 'Get Messages Channel 3') with resource: 'channel', operation: 'history', and timestamp filtering via 'filters.oldest'. However, all three nodes have 'returnAll': false with 'limit': 100, which violates the requirement for 'returnAll: true'.
- `[pairwise-rule]` (judge1) [Aggregate the inputs of AI Agent node using input.all() or an aggregate node.] No AI Agent node exists in the workflow. While there is an 'Aggregate Messages' node (id: 1b06ad81-55ea-4f72-8237-e0dcc2c525f5) of type 'n8n-nodes-base.aggregate', it is not aggregating inputs for an AI Agent node since no AI Agent node is present.

**programmatic:**

- `[critical]` (connections) Node Daily at 9 AM (n8n-nodes-base.scheduleTrigger) received unsupported connection type main
- `[major]` (graphValidation) Merge node "Combine All Messages" has only 1 input connection(s). Merge nodes require at least 2 inputs.
- `[minor]` (graphValidation) Node "Post Summary to Channel" has parameter "text" containing {{ $... }} without '=' prefix. n8n expressions must start with '=' like '={{ $json.field }}'.

---

### example-063-08b64b0e

- **Status:** fail
- **Score:** 0.500
- **Prompt:** Build me an AI chat interface that connects to my Google Sheets. It should remember our conversation...

**pairwise:**

- `[pairwise-rule]` (judge1) [There exists an ai_memory connection from n8n-nodes-langchain.memoryBufferWindow to n8n-nodes-langchain.chatTrigger and to n8n-nodes-langchain.agent.] The 'Conversation Memory' node (memoryBufferWindow) has an ai_memory connection to 'Google Sheets AI Assistant' (agent), but there is NO ai_memory connection from 'Conversation Memory' to 'Chat Interface' (chatTrigger). The connections object shows only one ai_memory connection from Conversation Memory to the agent node.
- `[pairwise-rule]` (judge1) [The n8n-nodes-langchain.lmChatOpenAi should use gpt-5-mini.] The 'OpenAI GPT-4' node (lmChatOpenAi) uses model 'gpt-4o-mini', not 'gpt-5-mini' as required. The model parameter shows: 'value': 'gpt-4o-mini'.
- `[pairwise-rule]` (judge1) [The n8n-nodes-base.googleSheetsTool node uses $fromAI in 1+ fields and has a toolDescription.] While the 'Google Sheets Data' node has a toolDescription, it does NOT use $fromAI in any fields. The documentId uses a placeholder value, sheetName uses a placeholder string, and filtersUI is empty ({}). For the tool to dynamically accept AI-provided values, at least one field should contain $fromAI() expression, which is missing.

---

### example-064-da94fd30

- **Status:** fail
- **Score:** 0.500
- **Prompt:** You are a B2B Lead Generation Agent specialized in analyzing LinkedIn profiles.

**pairwise:**

- `[pairwise-rule]` (judge1) [Use a Structured Output Parser (@n8n/n8n-nodes-langchain.outputParserStructured) to parse the AI Agent (n8n-nodes-langchain.agent) output.] The workflow does NOT contain a Structured Output Parser node. The AI Agent node 'B2B Lead Analyzer' (type: @n8n/n8n-nodes-langchain.agent) is connected directly to a Code node 'Structure Lead Data' (type: n8n-nodes-base.code) for parsing output, instead of using the required @n8n/n8n-nodes-langchain.outputParserStructured node.
- `[pairwise-rule]` (judge1) [Use a service like PhantomBuster or Apify to scrap linkedin data.] The workflow does NOT use PhantomBuster or Apify for LinkedIn data scraping. Instead, it uses an HTTP Request node 'Fetch LinkedIn Profile' (type: n8n-nodes-base.httpRequest) to fetch LinkedIn data. No PhantomBuster or Apify nodes are present in the workflow.
- `[pairwise-rule]` (judge1) [Use an n8n form as a workflow trigger with option to enter linkedin profile URL.] The workflow uses a Manual Trigger node 'Start Lead Analysis' (type: n8n-nodes-base.manualTrigger) as the trigger, NOT an n8n form trigger. There is no form node configured to accept LinkedIn profile URL input from users.
- `[pairwise-rule]` (judge1) [Use HTTP request node or tool to scrape linkedin.] The workflow DOES use an HTTP Request node to scrape LinkedIn. Node 'Fetch LinkedIn Profile' (type: n8n-nodes-base.httpRequest) is configured with method 'GET' and a placeholder URL for LinkedIn profile data, which violates the anti-pattern of using HTTP requests for LinkedIn scraping.

---

### example-066-19e87a73

- **Status:** fail
- **Score:** 0.500
- **Prompt:** Create an automation that runs on Monday mornings. It reads my Gmail inbox from the weekend, analyze...

**pairwise:**

- `[pairwise-rule]` (judge1) [The AI Agent (n8n-nodes-langchain.agent) System prompt should aim to summarize emails based on the subject, sender, and the email body.] The workflow does not use an AI Agent node (n8n-nodes-langchain.agent). Instead, it uses a Chain LLM node (@n8n/n8n-nodes-langchain.chainLlm) with id '5905084f-6cc0-421d-9f80-1a2d6178f2f9'. This is a different node type that does not meet the requirement for using an AI Agent node.
- `[pairwise-rule]` (judge1) [The Gmail node (n8n-nodes-base.gmailTrigger) should have simplify explicitly disabled as the email body is crucial to know.] The workflow uses a Gmail node (n8n-nodes-base.gmail) with id '83557fed-5f62-47ed-a825-f5c3269f223b', not a Gmail Trigger node (n8n-nodes-base.gmailTrigger). Additionally, this Gmail node has 'simple' set to true in its parameters, which means simplify is enabled, not disabled. The email body would not be fully available with this configuration.
- `[pairwise-rule]` (judge1) [The AI agent (n8n-nodes-langchain.agent) system prompt should aim to include a few action items after reading all the input emails.] The workflow does not use an AI Agent node (n8n-nodes-langchain.agent). It uses a Chain LLM node (@n8n/n8n-nodes-langchain.chainLlm) instead. While the Chain LLM prompt does request action items, it does not meet the requirement of using an AI Agent node with a system prompt.
- `[pairwise-rule]` (judge1) [Use the Aggregate node (n8n-nodes-base.aggregate) to combine multiple emails to send for AI for combined analysis. Set the Aggregate node to combine the relevant fields.] The workflow does not contain an Aggregate node (n8n-nodes-base.aggregate). The emails are passed directly from the 'Get Weekend Emails' node to the 'Analyze Emails with AI' node without aggregation. The Chain LLM node uses JSON.stringify($input.all()) to combine emails, but this does not use the required Aggregate node.
- `[pairwise-rule]` (judge1) [Use the 'define below' source for prompt (user message) operation for AI Agent (n8n-nodes-langchain.agent).] The workflow does not use an AI Agent node (n8n-nodes-langchain.agent). While the Chain LLM node with id '5905084f-6cc0-421d-9f80-1a2d6178f2f9' has 'promptType' set to 'define', this is not the same as using an AI Agent node with 'define below' source for the user message.
- `[pairwise-rule]` (judge1) [The inputs to the AI Agent (n8n-nodes-langchain.agent) user prompt only has the subject and snippet.] PASS - This is a <dont> criterion. The workflow does not use an AI Agent node, and the Chain LLM node that is used includes all email data via JSON.stringify($input.all()), which would include more than just subject and snippet. Since the anti-pattern (limiting to only subject and snippet) is not present, this should be marked as a pass.
- `[pairwise-rule]` (judge1) [Use a n8n-nodes-base.code node when you Get Many emails and want to combine them to send for AI analysis.] PASS - This is a <dont> criterion (anti-pattern to avoid). The workflow does not contain a Code node (n8n-nodes-base.code). The emails are combined using JSON.stringify($input.all()) directly in the Chain LLM node's text parameter, not through a Code node. Since the anti-pattern is not present, this should be marked as a pass.

---

### example-068-10a1bf6e

- **Status:** fail
- **Score:** 0.492
- **Prompt:** Read the contents of two Google sheets and find the rows that appear in both sheets. Match on the co...

**pairwise:**

- `[pairwise-rule]` (judge1) [Use n8n-nodes-base.compareDatasets node or merge node (n8n-nodes-base.merge).] The workflow does use a merge node (node 'Combine Sheets' with type 'n8n-nodes-base.merge' at position [840, 300]), but it is configured with mode 'combine' and combineBy 'combineByPosition', which simply combines items by position rather than finding matching rows based on key fields. The compareDatasets node is not used. While a merge node is technically present, it is not being used to find matching rows - that logic is delegated to the Code node instead. The merge node should be configured with mode 'combine' and combineBy 'combineByFields' or the compareDatasets node should be used to properly match rows based on a key field like 'id'.
- `[pairwise-rule]` (judge1) [Use code node to find matching rows.] The workflow contains a Code node named 'Find Matching Rows' (node ID '16f723a2-a702-442c-a79d-85dd8b319ee6', type 'n8n-nodes-base.code') that explicitly implements matching logic. The jsCode parameter contains logic that creates a map of sheet2 items by id, iterates through sheet1 items, and finds matches based on the id field. This is exactly the anti-pattern that should be avoided according to the <dont> criterion.

**programmatic:**

- `[major]` (graphValidation) Merge node "Combine Sheets" has only 1 input connection(s). Merge nodes require at least 2 inputs.

---

### example-070-f801a2f6

- **Status:** fail
- **Score:** 0.500
- **Prompt:** I'd like to build a multi-step form that writes to a Google Sheet. Some of the questions involve cho...

**pairwise:**

- `[pairwise-rule]` (judge1) [The workflow has flow logic nodes such as If (n8n-nodes-base.if) or Switch (n8n-nodes-base.switch).] No flow logic nodes found in the workflow. The workflow contains only 'n8n-nodes-base.formTrigger', 'n8n-nodes-base.notion', and 'n8n-nodes-base.googleSheets' nodes. There are no If or Switch nodes present to control workflow logic flow.
- `[pairwise-rule]` (judge1) [The workflow contains 2+ form nodes, for example, Form (n8n-nodes-base.form) and Form trigger (n8n-nodes-base.formTrigger).] Only 1 form-related node found in the workflow. The workflow contains a single 'n8n-nodes-base.formTrigger' node named 'Hackmation Survey Form'. There are no additional Form (n8n-nodes-base.form) nodes or other form trigger nodes to meet the 2+ requirement.

---

### example-071-41b56cb7

- **Status:** fail
- **Score:** 0.482
- **Prompt:** Build a news-scraping agent that crawls the web, finds startups that have raised over 1 million in f...

**pairwise:**

- `[pairwise-rule]` (judge1) [If there is an AI Agent (n8n-nodes-langchain.agent), then it is connected to a n8n-nodes-langchain.outputParserStructured node.] The workflow contains an AI Agent node named 'Startup Funding Agent' (type: @n8n/n8n-nodes-langchain.agent, id: 8cedbefd-3afc-464e-9e17-f4e1e7156cd5). According to the connections, this agent's main output connects to 'Parse Agent Results' (a code node), not to a n8n-nodes-langchain.outputParserStructured node. No outputParserStructured node exists in the workflow.
- `[pairwise-rule]` (judge1) [Use Data Tables (n8n-nodes-base.dataTable) to save funding information.] The workflow does not contain any n8n-nodes-base.dataTable node. Instead, funding information is saved using an Airtable node (node name: 'Save to Airtable', type: n8n-nodes-base.airtable, id: 3300fe9f-98a5-4b18-b4fb-1c983e751984). No Data Tables node is present in the workflow.

**programmatic:**

- `[major]` (agentPrompt) Agent node "Startup Funding Agent" has no expression in its prompt field. This likely means it failed to use chatInput or dynamic context

---

## Examples Without Violations

- example-006-f4b1575c (error, score: 0.000)
- example-008-c388b379 (pass, score: 1.000)
- example-009-6351dfbe (pass, score: 1.000)
- example-010-d11d6ce1 (pass, score: 1.000)
- example-011-6ef67bee (pass, score: 1.000)
- example-014-3fdbbe2d (pass, score: 1.000)
- example-018-7036bf86 (pass, score: 1.000)
- example-020-607821cc (pass, score: 1.000)
- example-027-a2e8c9ed (pass, score: 1.000)
- example-029-14622ad0 (pass, score: 1.000)
- example-030-89f7c91b (pass, score: 1.000)
- example-038-45611fbe (pass, score: 1.000)
- example-039-8397e363 (pass, score: 1.000)
- example-051-91d05a8e (pass, score: 1.000)
- example-052-8bb635b7 (pass, score: 1.000)
- example-053-96e9458a (pass, score: 1.000)
- example-057-5876f412 (pass, score: 1.000)
- example-059-37fdd937 (pass, score: 1.000)
- example-061-42ab47ad (pass, score: 1.000)
- example-065-79bd8cea (pass, score: 1.000)
- example-067-59c4bdff (pass, score: 1.000)
- example-069-b523c7a1 (pass, score: 1.000)
