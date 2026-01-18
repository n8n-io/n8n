return workflow('1AeBTEXwiwxSvJ37', 'AI-Powered Email Automation', { executionOrder: 'v1' })
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { position: [-140, -860], name: 'When clicking ‘Test workflow’' } }))
  .then(node({ type: 'n8n-nodes-base.googleDocs', version: 2, config: { parameters: {
      operation: 'get',
      documentURL: 'https://docs.google.com/document/*********'
    }, position: [80, -860], name: 'Get a document' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.vectorStorePinecone', version: 1, config: { parameters: {
      mode: 'insert',
      options: { pineconeNamespace: 'docsmail' },
      pineconeIndex: {
        __rl: true,
        mode: 'list',
        value: 'n8ndocs',
        cachedResultName: 'n8ndocs'
      }
    }, subnodes: { embedding: embedding({ type: '@n8n/n8n-nodes-langchain.embeddingsOpenAi', version: 1.2, config: { parameters: { options: {} }, name: 'Embeddings OpenAI' } }), documentLoader: documentLoader({ type: '@n8n/n8n-nodes-langchain.documentDefaultDataLoader', version: 1, config: { parameters: { options: {} }, subnodes: { textSplitter: textSplitter({ type: '@n8n/n8n-nodes-langchain.textSplitterRecursiveCharacterTextSplitter', version: 1, config: { parameters: { options: {}, chunkSize: 200, chunkOverlap: 50 }, name: 'Recursive Character Text Splitter' } }) }, name: 'Default Data Loader' } }) }, position: [340, -860], name: 'Pinecone Vector Store' } }))
  .add(trigger({ type: 'n8n-nodes-base.executeWorkflowTrigger', version: 1.1, config: { parameters: { inputSource: 'passthrough' }, position: [20, 600], name: 'When Executed by Another Workflow' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 1.7, config: { parameters: {
      text: '={{ $json.query }}',
      options: { systemMessage: 'You are a helpful assistant to send mails.' },
      promptType: 'define'
    }, subnodes: { tools: [tool({ type: 'n8n-nodes-base.gmailTool', version: 2.1, config: { parameters: {
          sendTo: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'To\', ``, \'string\') }}',
          message: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Message\', ``, \'string\') }}',
          options: {},
          subject: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Subject\', ``, \'string\') }}'
        }, name: 'Gmail' } })], model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.2, config: { parameters: {
          model: { __rl: true, mode: 'list', value: 'gpt-4o-mini' },
          options: {}
        }, name: 'OpenAI Chat Model' } }) }, position: [240, 600], name: 'AI Agent' } }))
  .add(trigger({ type: '@n8n/n8n-nodes-langchain.chatTrigger', version: 1.1, config: { parameters: { options: {} }, position: [0, -200], name: 'When chat message received' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 1.7, config: { parameters: {
      options: {
        systemMessage: '=# Role:  \nYou are an intelligent email agent that automatically sends personalized emails to recipients. Your task is to generate and send a clear, professional, and accurate email based on the provided names, email addresses, and desired content.  \n\n## Rules & Behavior:  \n\n# You have 2 Tools and need to use them correctly, you always use both tools, first the Vectorstore_mails after that the send_mail\n\n## Vectorstore_mails \nUse this tool to get Email adresses, you can get all mail adresses from pinecone.\nwinter test = winterIsComming@gmail.com\n\n## send_mail\nUse this tool to send mails.\n\n### Email Format:  \n- The email must include a **subject line**.  \n- It should begin with an appropriate **salutation** (e.g., "Hello [Name]" or "Dear [Name]").  \n- The **main content** should be clear, concise, and friendly.  \n- The email should end with a **suitable closing phrase** (e.g., "Best regards, Arnie").  \n\n### Dynamic Personalization:  \n- Automatically replace the placeholder **[Name]** with the recipient’s actual name.  \n- If the name is missing, use a general salutation such as **"Hello, dear team"**.  \n\n### Review & Optimization:   \n- Avoid unnecessary **repetitions or vague wording**.  \n- If the message is **too long or unstructured, summarize it clearly**.  \n\n## Email Types (Adaptable Based on Context):  \n- Standard information email  \n- Reminder or follow-up  \n- Offer or marketing email  \n- Support or customer service request  \n\n---\n\n### Example of a Generated Email:  \n\n**Subject:** Important Information for You, [Name]  \n\n**Text:**  \nHello [Name],  \n\nI hope you are doing well. I wanted to quickly inform you about [Topic]. If you have any questions or need further information, feel free to reach out.  \n\nBest regards,  \nSender Name  \n'
      }
    }, subnodes: { tools: [tool({ type: '@n8n/n8n-nodes-langchain.toolWorkflow', version: 2, config: { parameters: {
          name: 'send_mail',
          workflowId: {
            __rl: true,
            mode: 'list',
            value: 'GLkrSkyYtlep3P6e',
            cachedResultName: 'Send Mails Pinecone'
          },
          description: 'Use this tool to send mails.',
          workflowInputs: {
            value: {},
            schema: [],
            mappingMode: 'defineBelow',
            matchingColumns: [],
            attemptToConvertTypes: false,
            convertFieldsToString: false
          }
        }, name: 'send_mail' } }), tool({ type: '@n8n/n8n-nodes-langchain.toolVectorStore', version: 1, config: { parameters: {
          name: 'Vectorstore_mails',
          description: 'Use this Tool to get Email Information, you find all relevant mail adresses, you also give mail adresses.'
        }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.2, config: { parameters: {
          model: {
            __rl: true,
            mode: 'list',
            value: 'gpt-4o',
            cachedResultName: 'gpt-4o'
          },
          options: {}
        }, name: 'OpenAI Chat Model1' } }), vectorStore: vectorStore({ type: '@n8n/n8n-nodes-langchain.vectorStorePinecone', version: 1, config: { parameters: {
          options: { pineconeNamespace: 'docsmail' },
          pineconeIndex: {
            __rl: true,
            mode: 'list',
            value: 'n8ndocs',
            cachedResultName: 'n8ndocs'
          }
        }, subnodes: { embedding: embedding({ type: '@n8n/n8n-nodes-langchain.embeddingsOpenAi', version: 1.2, config: { parameters: { options: {} }, name: 'Embeddings OpenAI1' } }) }, name: 'Pinecone Vector Store1' } }) }, name: 'Vectorstore Mails' } })], model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.2, config: { parameters: {
          model: {
            __rl: true,
            mode: 'list',
            value: 'gpt-4o',
            cachedResultName: 'gpt-4o'
          },
          options: {}
        }, name: 'OpenAI Chat Model2' } }) }, position: [220, -200], name: 'AI Agent1' } }))
  .add(sticky('#### **First Step**\n* Add list of contact Email from Google Docs to vector store "Pinecone"\n\n  * **Read Google Docs Data:** Use the n8n Google Docs node to access and retrieve the list of contact emails from your specified document.\n\n  * **Prepare Data for Vectorization:** Process the extracted emails (and any other relevant fields) using n8n\'s data manipulation nodes (e.g., Code, Set, Split In Batches) to format them for vectorization.\n\n  * **Generate Embeddings:** Integrate an n8n node using "Embeddings OpenAI" to an embedding service, to convert the email data into vector embeddings.\n\n  * **Upsert to Pinecone:** Use the n8n Pinecone node to connect to the Pinecone index and efficiently upload the generated vectors, along with unique IDs and metadata.', { position: [-860, -860], width: 660, height: 360 }))
  .add(sticky('#### **Second Step**\n* Retrieve email addresses from Pinecone and generate personalized emails, then uses a separate workflow to send them, all triggered by a chat message.\n\n   * **AI Agent (Core Logic):** An AI Agent (configured with gpt-4o) uses a detailed system message to act as an intelligent email sender. Its rules dictate it must always use two tools: Vectorstore_mails and send_mail.\n\n   * **Vectorstore Mails (Tool):** This tool, connected to a Pinecone Vector Store (n8ndocs index, docsmail namespace) and an OpenAI Embeddings model, allows the AI Agent to retrieve email addresses based on user queries (e.g., "winter test" returns "winterIsBack@gmail.com").\n\n   * **Send Mail (Tool):** This tool is a reference to another n8n workflow  named "Send Mails Pinecone" that handles the actual email sending. The AI Agent will dynamically construct the email content and recipient details to pass to this tool.\n\n   * **Email Generation:** The AI Agent is responsible for generating personalized, clear, and professional emails, dynamically replacing placeholders like [Name] and ensuring proper formatting (subject, salutation, content, closing).', { name: 'Sticky Note1', color: 6, position: [-860, -120], width: 760, height: 420 }))
  .add(sticky('#### **Third Step**\n* Triggered by second workflow, uses an AI Agent to dynamically compose and send emails via Gmail, extracting recipient, subject, and message content from the incoming data.\n\n  * Triggered by another workflow: This workflow starts when called by the "Mail Agend Pinecone" workflow, receiving the email details as input.\n\n  * AI Agent (Email Generation): An AI Agent (using gpt-4o-mini) acts as a helpful assistant to process the incoming request and prepare the specific To, Subject, and Message content for the email.\n\n  * Send Email via Gmail: The prepared email details are then passed to the Gmail node, which sends the email to the designated recipient.', { name: 'Sticky Note2', color: 5, position: [-840, 580], width: 800, height: 340 }))