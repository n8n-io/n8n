return workflow('icW2uoM7g7pFZhsR', 'AI-Powered Product Research & SEO Content Automation', { executionOrder: 'v1' })
  .add(trigger({ type: 'n8n-nodes-base.formTrigger', version: 2.2, config: { parameters: {
      options: {},
      formTitle: 'Product Research ',
      formFields: {
        values: [
          {
            fieldLabel: 'title',
            placeholder: 'Enter product title',
            requiredField: true
          }
        ]
      }
    }, position: [-180, -140], name: 'On form submission' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '39f794ce-8c11-4f72-b8d9-4ad0894d1e05',
            name: 'title',
            type: 'string',
            value: '={{ $json.title }}'
          }
        ]
      }
    }, position: [120, -140], name: 'Edit Fields' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 1, config: { parameters: {
      url: 'https://www.googleapis.com/customsearch/v1',
      options: {},
      queryParametersUi: {
        parameter: [
          { name: 'key', value: 'your key' },
          { name: 'cx', value: 'your cx' },
          {
            name: 'q',
            value: '=intitle:"{{ $json.title }}" (pricing OR features OR buy OR software) -medium.com -quora.com -youtube.com -linkedin.com '
          }
        ]
      }
    }, position: [400, -120], name: 'Google Search' } }))
  .then(node({ type: 'n8n-nodes-base.function', version: 1, config: { parameters: {
      functionCode: 'let allTitles = [];\nlet allDescriptions = [];\nlet allKeywords = [];\n\nfor (const item of $json.items) {\n  allTitles.push(item.title);\n  allDescriptions.push(item.snippet);\n\n  const keywords = item.title\n    .toLowerCase()\n    .replace(/[^a-zA-Z0-9 ]/g, \'\')\n    .split(\' \')\n    .filter(w => w.length > 3);\n\n  allKeywords.push(...keywords);\n}\n\n// Create unique keywords\nconst uniqueKeywords = [...new Set(allKeywords)];\n\nreturn [\n  {\n    json: {\n      chatInput: `\nTitle List:\n${allTitles.join(\'\\n\')}\n\nDescription List:\n${allDescriptions.join(\'\\n\')}\n\nKeywords:\n${uniqueKeywords.join(\', \')}\n      `.trim()\n    }\n  }\n];\n'
    }, position: [680, -100], name: 'Extract Competitor Data' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.chainLlm', version: 1.5, config: { parameters: {
      messages: {
        messageValues: [
          {
            message: 'You are an expert SEO content writer and product copywriter.  generate the following in one output:  1. SEO Meta Data: - Title: (exact product title, must be the same as product title below) - Description: A concise, persuasive meta description optimized for Google SEO best practices. Make sure it is between 120-160 characters, includes main keywords naturally, and encourages clicks. - Keywords: A list of relevant, highly ranked keywords related to the product.  2. Product Content: - Product Title: (exact same title as SEO Meta Data Title) - Product Description: A detailed, engaging product description of minimum 150 words that highlights the product’s key features, benefits, and usage. Use natural language with relevant keywords but avoid keyword stuffing.  Format the output exactly like this:  --- SEO Meta Data: Title: ... Description: ... Keywords: ...  Product Content: Product Title: ... Product Description: ...  ---  Ensure that the SEO Meta Data Title and Product Title are exactly the same string. Follow SEO best practices for titles, descriptions, and keyword usage to maximize Google ranking potential.'
          }
        ]
      }
    }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini', version: 1, config: { parameters: { options: {}, modelName: 'models/gemini-2.0-flash' }, credentials: {
          googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' }
        }, name: 'Google Gemini Chat Model' } }) }, position: [920, -100], name: 'Basic LLM Chain' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: 'const inputText = $json.text; // Your combined text input\n\nfunction getFieldValue(text, field) {\n  const regex = new RegExp(field + \':\\\\s*([\\\\s\\\\S]*?)(?=\\\\n\\\\S|$)\', \'i\');\n  const match = text.match(regex);\n  return match ? match[1].trim() : \'\';\n}\n\nfunction splitSections(text) {\n  // Extract sections by titles\n  const seoMetaMatch = text.match(/SEO Meta Data:\\n([\\s\\S]*?)\\n\\nProduct Content:/i);\n  const productContentMatch = text.match(/Product Content:\\n([\\s\\S]*)/i);\n\n  const seoMeta = seoMetaMatch ? seoMetaMatch[1].trim() : \'\';\n  const productContent = productContentMatch ? productContentMatch[1].trim() : \'\';\n\n  return [\n    {\n      json: {\n        type: \'seo_meta_data\',\n        title: getFieldValue(seoMeta, \'Title\'),\n        description: getFieldValue(seoMeta, \'Description\'),\n        keywords: getFieldValue(seoMeta, \'Keywords\'),\n        product_title: \'\',          // empty for SEO row\n        product_description: \'\'     // empty for SEO row\n      }\n    },\n    {\n      json: {\n        type: \'product_content\',\n        title: \'\',                  // empty for Product row\n        description: \'\',\n        keywords: \'\',\n        product_title: getFieldValue(productContent, \'Product Title\'),\n        product_description: getFieldValue(productContent, \'Product Description\')\n      }\n    }\n  ];\n}\n\nreturn splitSections($input.first().json.text);\n'
    }, position: [1340, -100], name: 'Code Formatting' } }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4.5, config: { parameters: {
      columns: {
        value: {},
        schema: [
          {
            id: 'type',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'type',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'title',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'title',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'description',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'description',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'keywords',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'keywords',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'product_title',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'product_title',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'product_description',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'product_description',
            defaultMatch: false,
            canBeUsedToMatch: true
          }
        ],
        mappingMode: 'autoMapInputData',
        matchingColumns: ['text'],
        attemptToConvertTypes: false,
        convertFieldsToString: false
      },
      options: {},
      operation: 'appendOrUpdate',
      sheetName: { __rl: true, mode: 'url', value: '' },
      documentId: { __rl: true, mode: 'url', value: '' },
      authentication: 'serviceAccount'
    }, credentials: {
      googleApi: { id: 'credential-id', name: 'googleApi Credential' }
    }, position: [1660, -140] } }))
  .add(sticky('# 🚀 AI-Powered Product Research & SEO Content Automation\n\nAn **AI-powered automation** that performs product research, extracts competitor insights, and generates SEO-optimized product content using Google Search and a large language model (LLM) like Google Gemini or OpenAI. The output is cleanly structured and saved into Google Sheets—ready for publishing.\n### Workflow Steps:\n1. **On form submission**  \n   *The user provides the product title via a form.*\n\n2. **Edit Fields**  \n   *The product title is prepared for the Google search query.*\n\n3. **Google Search**  \n   *A search is made on Google for competitor products and relevant information.*\n\n4. **Extract Competitor Data**  \n   *Competitor data, such as titles, descriptions, and keywords, is extracted from the search results.*\n\n5. **Basic LLM Chain**  \n   *SEO metadata and product content are generated using LangChain’s language model.*\n\n6. **Google Gemini Chat Model**  \n   *Google Gemini (PaLM) refines the generated content for quality and engagement.*\n\n7. **Code**  \n   *The content is split into SEO Meta Data and Product Content sections.*\n\n8. **Google Sheets**  \n   *All the generated content is stored in Google Sheets for easy access.*\n\n---\n\n## How This Flow Resolves Challenges:\n\n- **Automates Time-Consuming Tasks:**  \n  This workflow eliminates manual research and content writing by automating the gathering of competitor data and SEO content generation.\n  \n- **Improves SEO Outcomes:**  \n  By leveraging AI models like LangChain and Google Gemini, the workflow ensures that SEO metadata and product content are optimized for search engines.\n\n- **Efficient Organization:**  \n  The workflow splits content into clear sections and stores everything in Google Sheets, making it easy to access and manage data.\n\n- **Reduces Human Error:**  \n  Automation reduces the chances of missing important steps in content generation, ensuring consistency and accuracy.\n\n- **Centralized Data Management:**  \n  Storing everything in Google Sheets makes tracking, updating, and managing generated content straightforward and efficient.\n', { position: [-1160, -500], width: 640, height: 1340 }))
  .add(sticky('### 1. **On form submission**\n- *Trigger*: Collects the product title entered by the user via the form. This is the starting point of the workflow, where the process is initiated.\n\n', { name: 'Sticky Note1', position: [-240, -300], height: 340 }))
  .add(sticky('### 2. **Edit Fields**\n- *Action*: Formats the product title to fit the required query parameters for the Google search. This ensures the title is ready for the next step.\n', { name: 'Sticky Note2', position: [60, -300], height: 340 }))
  .add(sticky('### 3. **Google Search**\n- *Action*: Executes a Google Custom Search API query to retrieve competitor data based on the product title. This helps in gathering insights from similar products or competitors.\n', { name: 'Sticky Note3', position: [340, -300], height: 340 }))
  .add(sticky('### 4. **Extract Competitor Data**\n- *Action*: Extracts key information (titles, descriptions, and keywords) from the search results. This data provides valuable insights into competitor strategies and product offerings.\n', { name: 'Sticky Note4', position: [620, -300], height: 340 }))
  .add(sticky('### 5. **Basic LLM Chain**\n- *Action*: Uses LangChain’s language model to generate SEO metadata (title, description, keywords) and product content (description, title). The content is optimized for search engines.\n', { name: 'Sticky Note5', position: [900, -300], width: 320, height: 340 }))
  .add(sticky('### 6. **Google Gemini Chat Model**\n- *Action*: Refines and improves the content generated in the previous step by using Google Gemini (PaLM) to enhance its quality and engagement.\n', { name: 'Sticky Note6', position: [900, 160], width: 260, height: 320 }))
  .add(sticky('### 7. **Code Formating **\n- *Action*: Splits the generated content into two sections: SEO Meta Data and Product Content, organizing the output into clearly defined sections for easy use.\n\n', { name: 'Sticky Note7', position: [1280, -300], height: 340 }))
  .add(sticky('### 8. **Google Sheets**\n- *Action*: Appends the final SEO metadata and product content into a Google Sheets document, making it easy to store, access, and track the generated information.', { name: 'Sticky Note8', position: [1600, -300], height: 340 }))