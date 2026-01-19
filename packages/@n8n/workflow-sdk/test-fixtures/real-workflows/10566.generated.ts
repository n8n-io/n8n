return workflow('', '')
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { position: [-736, 32], name: 'When clicking ‘Execute workflow’' } }))
  .then(node({ type: 'n8n-nodes-base.googleDrive', version: 3, config: { parameters: {
      fileId: {
        __rl: true,
        mode: 'id',
        value: '=1wS9U7MQDthj57CvEcqG_Llkr-ek6RqGA'
      },
      options: {},
      operation: 'download'
    }, credentials: {
      googleDriveOAuth2Api: {
        id: 'credential-id',
        name: 'googleDriveOAuth2Api Credential'
      }
    }, position: [-544, 32], name: 'Download file' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://api.subworkflow.ai/v1/extract',
      method: 'POST',
      options: {},
      sendBody: true,
      contentType: 'multipart-form-data',
      authentication: 'genericCredentialType',
      bodyParameters: {
        parameters: [
          {
            name: 'file',
            parameterType: 'formBinaryData',
            inputDataFieldName: 'data'
          },
          { name: 'expiresInDays', value: '0' }
        ]
      },
      genericAuthType: 'httpHeaderAuth'
    }, credentials: {
      httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' }
    }, position: [-352, 32], name: 'Extract API' } }))
  .then(ifBranch([node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: '=https://api.subworkflow.ai/v1/datasets/{{ $json.data.datasetId }}',
      options: {},
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth'
    }, credentials: {
      httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' }
    }, position: [608, -128], name: 'Get Dataset' } }), node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: '=https://api.subworkflow.ai/v1/jobs/{{ $json.data.id }}',
      options: {},
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth'
    }, credentials: {
      httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' }
    }, position: [128, 32], name: 'Check Job Status' } })], { version: 2.2, parameters: {
      options: {},
      conditions: {
        options: {
          version: 2,
          leftValue: '',
          caseSensitive: true,
          typeValidation: 'strict'
        },
        combinator: 'or',
        conditions: [
          {
            id: '3b76a3df-2333-42ae-adc9-e82c3e6d8cf5',
            operator: {
              name: 'filter.operator.equals',
              type: 'string',
              operation: 'equals'
            },
            leftValue: '={{ $json.data.status }}',
            rightValue: 'SUCCESS'
          },
          {
            id: '5ae3b589-fd55-43ea-8e94-4923dd2bbc5f',
            operator: {
              name: 'filter.operator.equals',
              type: 'string',
              operation: 'equals'
            },
            leftValue: '={{ $json.data.status }}',
            rightValue: 'ERROR'
          }
        ]
      }
    }, name: 'Job Complete?' }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: '=https://api.subworkflow.ai/v1/datasets/{{ $json.data.id }}/items?row=jpg&limit=10',
      options: {
        pagination: {
          pagination: {
            parameters: {
              parameters: [
                {
                  name: 'offset',
                  value: '={{ ($response.body.offset ?? 0) + 10 }}'
                }
              ]
            },
            maxRequests: 5,
            requestInterval: 500,
            limitPagesFetched: true,
            completeExpression: '={{ $response.body.data.length < 10 }}',
            paginationCompleteWhen: 'other'
          }
        }
      },
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth'
    }, credentials: {
      httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' }
    }, position: [832, -128], name: 'Get Dataset Items' } }))
  .then(node({ type: 'n8n-nodes-base.splitOut', version: 1, config: { parameters: { options: {}, fieldToSplitOut: 'data' }, position: [1232, -128] } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.googleGemini', version: 1, config: { parameters: {
      text: 'Transcribe this image to Markdown',
      modelId: {
        __rl: true,
        mode: 'list',
        value: 'models/gemini-2.5-flash',
        cachedResultName: 'models/gemini-2.5-flash'
      },
      options: {},
      resource: 'image',
      imageUrls: '={{ $json.share.url }}',
      operation: 'analyze'
    }, credentials: {
      googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' }
    }, position: [1440, -128], name: 'Document OCR via VLM' } }))
  .then(node({ type: 'n8n-nodes-base.wait', version: 1.1, config: { parameters: { amount: 1 }, position: [288, 32] } }))
  .add(sticky('### 1. Upload Binary File to Extract API\n[Extract API Documentation](https://docs.subworkflow.ai/api-reference/post-v1-extract)\n\nOur workflow starts with uploading our document to the SubworkflowAI service. There are actually 2 methods to do so but for this example, we\'ll focus on the Extract API. The Extract API does the minimal to split, convert and index pages of a document for easy retrieval. This API call fires off an async job so the response of this API is a "job" object.', { name: 'Sticky Note', color: 7, position: [-832, -160], width: 672, height: 416 }))
  .add(sticky('### 2. Poll for Async "Extract" Job to Complete\n[Jobs API Documentation](https://docs.subworkflow.ai/api-reference/get-v1-jobs-id)\n\nWhilst the extract API is busy with our file, the "job" record associated with the task is how we track its progress. Use a loop to poll the job and conditional act on the "status" property - whilst the status is "IN_PROGRESS", we continue to poll and when we hit "SUCCESS" or "ERROR", we can break out of the loop.', { name: 'Sticky Note1', color: 7, position: [-128, -160], width: 608, height: 416 }))
  .add(sticky('### 3. Fetch Resulting Dataset and Get Dataset Items\n[Datasets API Documentation](https://docs.subworkflow.ai/api-reference/get-v1-datasets)\n\nOnce the extract process is done, we can safely access the corresponding Dataset which is represents the original file. Note, we do not receive all pages back - this would be too memory intensive! Instead, Subworkflow holds on to the data until you explicitly request for them. To get the individual pages of document, call the DatasetItems API.', { name: 'Sticky Note2', color: 7, position: [512, -368], width: 544, height: 432 }))
  .add(sticky('### 4. Example VLM Use-Case - Document OCR\n[Learn more about the Gemini node](https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-langchain.googlegemini/)\n\nFinally, the DatasetItems API provides a "Share link" to publicly share the page data binary. You can use these links as image inputs for most multimodal LLMs to perform, as in this example, document OCR via VLM (Visual Language Model).\nThe benefit of using Subworkflow here is no additional binary data is further downloaded and/or passed between nodes helping to reduce the memory required to run the workflow.', { name: 'Sticky Note4', color: 7, position: [1072, -368], width: 640, height: 432 }))
  .add(sticky('### Next Steps\nLet\'s next check out the Search API!\nhttps://docs.subworkflow.ai/api-reference/post-v1-search', { name: 'Sticky Note6', position: [1744, -32], width: 416, height: 96 }))
  .add(sticky('[![banner](https://cdn.subworkflow.ai/marketing/banner-300x100.png#full-width)](https://subworkflow.ai?utm=n8n)\n## Working with Large Documents In Your VLM OCR Workflow\n\nDocument workflows are popular ways to use AI but what happens when your document is too large for your app or your AI to handle? Whether its context window or application memory that\'s grinding to a halt, [Subworkflow.ai](https://subworkflow.ai) is one approach to keep you going.\n\n### Prequisites\n1. You\'ll need a Subworkflow.ai API key to use the Subworkflow.ai service.\n2. Add the API key as a header auth credential. More details in the official docs - [https://docs.subworkflow.ai/category/api-reference](https://docs.subworkflow.ai/category/api-reference)\n\n### How it Works\n1. Import your document into your n8n workflow\n2. Upload it to the Subworkflow.ai service via the **Extract API** using the HTTP node. This endpoint takes files up to 100mb.\n3. Once uploaded, this will trigger an `Extract` job on the service\'s side and the response is a "job" record to track progress.\n4. Poll Subworkflow.ai\'s `Jobs` endpoint and keep polling until the job is finished. You can use the "IF" node looping back unto itself to achieve this in n8n.\n5. Once the job is done, the `Dataset` of the uploaded document is ready for retrieval. Use the `Datasets` and `DatasetItems` API to retrieve whatever you need to complete your AI task.\n6. In this example, all pages are retrieved and run through a multimodal LLM to parse into markdown. A well-known process when parsing data tables or graphics are required.\n\n### How to use\n* Integrate Subworkflow\'s Extract API seemlessly into your existing document workflows to support larger documents from 100mb+ to up to 5000 pages.\n\n### Customising the workflow\n* Sometimes you don\'t want the entire document back especially if the document is quite large (think 500+ pages!), instead, use query parameters on the `DatasetItems` API to pick individual pages or a range of pages to reduce the load.\n\n### Need Help?\n* **Official API documentation** - [https://docs.subworkflow.ai/category/api-reference](https://docs.subworkflow.ai/category/api-reference)\n* **Join the discord** - [https://discord.gg/RCHeCPJnYw](RCHeCPJnYw)', { name: 'Sticky Note7', position: [-1360, -784], width: 480, height: 1232 }))