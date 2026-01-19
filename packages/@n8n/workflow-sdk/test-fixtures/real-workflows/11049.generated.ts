return workflow('N3fK4Vfe4OHmEujy', 'Anthropic Agent Skills API v2', { executionOrder: 'v1' })
  .add(trigger({ type: 'n8n-nodes-base.formTrigger', version: 2.3, config: { parameters: {
      options: {},
      formTitle: 'Use Anthropic Skills',
      formFields: {
        values: [
          { fieldLabel: 'Prompt', requiredField: true },
          {
            fieldType: 'dropdown',
            fieldLabel: 'File Type',
            fieldOptions: {
              values: [
                { option: 'PPTX' },
                { option: 'PDF' },
                { option: 'DOCX' },
                { option: 'XLXS' }
              ]
            },
            requiredField: true
          }
        ]
      }
    }, position: [144, 320], name: 'On form submission' } }))
  .then(switchCase([node({ type: 'n8n-nodes-base.httpRequest', version: 4.1, config: { parameters: {
      url: 'https://api.anthropic.com/v1/messages',
      method: 'POST',
      options: {},
      jsonBody: '={\n  "model": "claude-haiku-4-5-20251001",\n  "max_tokens": 50000,\n  "system": "# Professional PowerPoint Creator\\n\\n## Overview\\nThis skill enables Claude to create stunning, professional PowerPoint presentations with modern design principles, clear visual hierarchy, and optimal use of space.\\n\\n## Core Instructions\\n\\n### Primary Objective\\nCreate a single, visually appealing PowerPoint file that follows professional design standards and modern aesthetic principles.\\n\\n### Key Requirements\\n1. **Single File Output**: Create only ONE .pptx file - no additional files or readme documents\\n2. **Professional Design**: Apply clean, modern design principles throughout\\n3. **Visual Hierarchy**: Establish clear information hierarchy on each slide\\n4. **Space Utilization**: Use whitespace effectively to create breathing room and focus\\n5. **Consistency**: Maintain consistent styling across all slides\\n\\n## Design Principles\\n\\n### Layout Standards\\n- Use generous margins and padding\\n- Avoid cluttered slides - prioritize clarity over quantity of information\\n- Align elements consistently (left, center, or right alignment per slide)\\n- Create visual balance between text and imagery\\n\\n### Typography\\n- Use 2-3 complementary fonts maximum\\n- Establish clear size hierarchy (titles, subtitles, body text)\\n- Ensure sufficient contrast for readability\\n- Avoid excessive text on individual slides\\n\\n### Color Scheme\\n- Select a cohesive color palette (3-5 colors)\\n- Use colors purposefully to guide attention\\n- Ensure adequate contrast between text and backgrounds\\n- Consider color psychology appropriate to the content\\n\\n### Visual Elements\\n- Incorporate relevant imagery, icons, or graphics when appropriate\\n- Use high-quality visual assets\\n- Apply consistent styling to shapes and graphics\\n- Consider data visualization for numerical information\\n\\n## Implementation Notes\\n- Focus on creating a polished, professional output\\n- Prioritize quality over quantity of slides\\n- Adapt design choices to the presentation\'s purpose and audience\\n- Test that all elements are properly formatted and aligned",\n  "container": {\n    "skills": [\n      {\n        "type": "anthropic",\n        "skill_id": "pptx",\n        "version": "latest"\n      }\n    ]\n  },\n  "messages": [\n    {\n      "role": "user",\n      "content": "{{ $(\'On form submission\').item.json.Prompt }}"\n    }\n  ],\n  "tools": [\n    {\n      "type": "code_execution_20250825",\n      "name": "code_execution"\n    }\n  ]\n}',
      sendBody: true,
      sendHeaders: true,
      specifyBody: 'json',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      headerParameters: {
        parameters: [
          { name: 'anthropic-version', value: '2023-06-01' },
          {
            name: 'anthropic-beta',
            value: 'code-execution-2025-08-25,skills-2025-10-02'
          }
        ]
      }
    }, credentials: {
      httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' }
    }, position: [976, -32], name: 'Create PPTX' } }), node({ type: 'n8n-nodes-base.httpRequest', version: 4.1, config: { parameters: {
      url: 'https://api.anthropic.com/v1/messages',
      method: 'POST',
      options: {},
      jsonBody: '={\n  "model": "claude-haiku-4-5-20251001",\n  "max_tokens": 4096,\n  "system": "# Professional PDF Creator\\n\\n## Overview\\nThis skill enables Claude to create professional, well-formatted PDF documents with proper structure, clean styling, and excellent readability.\\n\\n## Core Instructions\\n\\n### Primary Objective\\nCreate a single, professional PDF file that follows document formatting standards and modern design principles.\\n\\n### Key Requirements\\n1. **Single File Output**: Create only ONE .pdf file - no additional files or readme documents\\n2. **Clean Formatting**: Apply professional formatting throughout the document\\n3. **Proper Structure**: Establish clear document hierarchy with appropriate headings and sections\\n4. **Readability**: Ensure optimal readability through proper spacing, typography, and layout\\n5. **Consistency**: Maintain consistent styling across all pages\\n\\n## Design Principles\\n\\n### Document Structure\\n- Use clear heading hierarchy (H1, H2, H3)\\n- Organize content into logical sections\\n- Include appropriate page breaks where needed\\n- Maintain consistent margins throughout\\n\\n### Typography\\n- Use professional, readable fonts\\n- Establish clear size hierarchy for different text levels\\n- Ensure sufficient line spacing for comfortable reading\\n- Use appropriate font weights (bold, regular) for emphasis\\n\\n### Layout Standards\\n- Use generous margins (typically 1-1.5 inches)\\n- Apply consistent spacing between sections\\n- Align text appropriately (left-aligned for body text)\\n- Create visual balance on each page\\n\\n### Visual Elements\\n- Incorporate tables, lists, or graphics when appropriate\\n- Ensure high-quality rendering of any images\\n- Use subtle styling for visual interest without distraction\\n- Consider adding headers/footers if appropriate\\n\\n## Implementation Notes\\n- Focus on creating a polished, professional output\\n- Prioritize clarity and readability\\n- Adapt formatting choices to the document\'s purpose\\n- Test that all elements render properly in the PDF format",\n  "container": {\n    "skills": [\n      {\n        "type": "anthropic",\n        "skill_id": "pdf",\n        "version": "latest"\n      }\n    ]\n  },\n  "messages": [\n    {\n      "role": "user",\n      "content": "{{ $(\'On form submission\').item.json.Prompt }}"\n    }\n  ],\n  "tools": [\n    {\n      "type": "code_execution_20250825",\n      "name": "code_execution"\n    }\n  ]\n}',
      sendBody: true,
      sendHeaders: true,
      specifyBody: 'json',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      headerParameters: {
        parameters: [
          { name: 'anthropic-version', value: '2023-06-01' },
          {
            name: 'anthropic-beta',
            value: 'code-execution-2025-08-25,skills-2025-10-02'
          }
        ]
      }
    }, credentials: {
      httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' }
    }, position: [976, 208], name: 'Create PDF' } }), node({ type: 'n8n-nodes-base.httpRequest', version: 4.1, config: { parameters: {
      url: 'https://api.anthropic.com/v1/messages',
      method: 'POST',
      options: {},
      jsonBody: '={\n  "model": "claude-haiku-4-5-20251001",\n  "max_tokens": 4096,\n  "system": "# Professional Word Document Creator\\n\\n## Overview\\nThis skill enables Claude to create professional, well-formatted Word documents with proper structure, consistent styling, and excellent readability.\\n\\n## Core Instructions\\n\\n### Primary Objective\\nCreate a single, professional DOCX file that follows document formatting standards and modern design principles.\\n\\n### Key Requirements\\n1. **Single File Output**: Create only ONE .docx file - no additional files or readme documents\\n2. **Professional Formatting**: Apply proper Word document formatting throughout\\n3. **Clear Structure**: Establish document hierarchy with appropriate heading styles\\n4. **Consistent Styling**: Maintain uniform formatting across all sections\\n5. **Readability**: Ensure optimal reading experience through proper spacing and typography\\n\\n## Design Principles\\n\\n### Document Structure\\n- Use Word heading styles (Heading 1, Heading 2, Heading 3) for proper hierarchy\\n- Organize content into logical sections and subsections\\n- Apply appropriate paragraph spacing\\n- Use page breaks strategically when needed\\n\\n### Typography\\n- Use professional, readable fonts (e.g., Calibri, Arial, Times New Roman)\\n- Establish clear size hierarchy for different text levels\\n- Apply proper line spacing (typically 1.15 or 1.5)\\n- Use font weights and styles (bold, italic) purposefully for emphasis\\n\\n### Layout Standards\\n- Set appropriate margins (typically 1 inch on all sides)\\n- Use consistent spacing between paragraphs and sections\\n- Align text appropriately (left-aligned for body text, centered for titles)\\n- Maintain professional indentation for lists and quotes\\n\\n### Content Elements\\n- Use bulleted and numbered lists where appropriate\\n- Format tables professionally with clear headers\\n- Incorporate images or graphics when relevant\\n- Apply styles consistently (e.g., Normal, Heading, List)\\n\\n## Implementation Notes\\n- Focus on creating a polished, professional output\\n- Prioritize clarity and document flow\\n- Adapt formatting choices to the document\'s purpose and audience\\n- Ensure all elements are properly styled using Word\'s built-in features",\n  "container": {\n    "skills": [\n      {\n        "type": "anthropic",\n        "skill_id": "docx",\n        "version": "latest"\n      }\n    ]\n  },\n  "messages": [\n    {\n      "role": "user",\n      "content": "{{ $(\'On form submission\').item.json.Prompt }}"\n    }\n  ],\n  "tools": [\n    {\n      "type": "code_execution_20250825",\n      "name": "code_execution"\n    }\n  ]\n}',
      sendBody: true,
      sendHeaders: true,
      specifyBody: 'json',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      headerParameters: {
        parameters: [
          { name: 'anthropic-version', value: '2023-06-01' },
          {
            name: 'anthropic-beta',
            value: 'code-execution-2025-08-25,skills-2025-10-02'
          }
        ]
      }
    }, credentials: {
      httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' }
    }, position: [976, 448], name: 'Create DOCX' } }), node({ type: 'n8n-nodes-base.httpRequest', version: 4.1, config: { parameters: {
      url: 'https://api.anthropic.com/v1/messages',
      method: 'POST',
      options: {},
      jsonBody: '={\n  "model": "claude-haiku-4-5-20251001",\n  "max_tokens": 4096,\n  "system": "# Professional Excel Spreadsheet Creator\\n\\n## Overview\\nThis skill enables Claude to create professional, well-formatted Excel spreadsheets with proper formulas, consistent formatting, and logical data organization.\\n\\n## Core Instructions\\n\\n### Primary Objective\\nCreate a single, professional XLSX file that follows spreadsheet best practices and modern data organization principles.\\n\\n### Key Requirements\\n1. **Single File Output**: Create only ONE .xlsx file - no additional files or readme documents\\n2. **Professional Formatting**: Apply proper Excel formatting throughout\\n3. **Clear Structure**: Organize data logically with appropriate headers and sections\\n4. **Functional Formulas**: Implement accurate, efficient formulas where needed\\n5. **Data Integrity**: Ensure data is properly structured and validated\\n\\n## Design Principles\\n\\n### Data Organization\\n- Use clear, descriptive column headers in the first row\\n- Organize data in a logical table structure\\n- Apply consistent data types within columns\\n- Use separate sheets for different data categories when appropriate\\n- Freeze panes for headers when datasets are large\\n\\n### Formatting Standards\\n- Apply professional cell formatting (borders, colors, alignment)\\n- Use bold headers with background colors for visibility\\n- Format numbers appropriately (currency, percentages, decimals)\\n- Apply consistent date formatting\\n- Use cell styles for uniformity\\n\\n### Formula Implementation\\n- Use clear, efficient formulas (SUM, AVERAGE, IF, VLOOKUP, etc.)\\n- Apply formulas consistently across rows/columns\\n- Use absolute references ($) where appropriate\\n- Include calculated columns and summary rows when relevant\\n- Verify formula accuracy\\n\\n### Visual Elements\\n- Apply conditional formatting to highlight key data\\n- Use data validation for controlled inputs\\n- Create charts or graphs when data visualization adds value\\n- Apply appropriate column widths for readability\\n- Use subtle color schemes that enhance rather than distract\\n\\n## Implementation Notes\\n- Focus on creating a functional, professional output\\n- Prioritize data clarity and usability\\n- Adapt formatting choices to the spreadsheet\'s purpose\\n- Test that all formulas calculate correctly\\n- Ensure the spreadsheet is easy to navigate and understand",\n  "container": {\n    "skills": [\n      {\n        "type": "anthropic",\n        "skill_id": "xlsx",\n        "version": "latest"\n      }\n    ]\n  },\n  "messages": [\n    {\n      "role": "user",\n      "content": "{{ $(\'On form submission\').item.json.Prompt }}"\n    }\n  ],\n  "tools": [\n    {\n      "type": "code_execution_20250825",\n      "name": "code_execution"\n    }\n  ]\n}',
      sendBody: true,
      sendHeaders: true,
      specifyBody: 'json',
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      headerParameters: {
        parameters: [
          { name: 'anthropic-version', value: '2023-06-01' },
          {
            name: 'anthropic-beta',
            value: 'code-execution-2025-08-25,skills-2025-10-02'
          }
        ]
      }
    }, credentials: {
      httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' }
    }, position: [976, 688], name: 'Create XLSX' } })], { version: 3.3, parameters: {
      rules: {
        values: [
          {
            outputKey: 'PPTX',
            conditions: {
              options: {
                version: 2,
                leftValue: '',
                caseSensitive: true,
                typeValidation: 'strict'
              },
              combinator: 'and',
              conditions: [
                {
                  id: 'a314af59-82c4-44a1-aeef-d0d1d88fb616',
                  operator: { type: 'string', operation: 'equals' },
                  leftValue: '={{ $json[\'File Type\'] }}',
                  rightValue: 'PPTX'
                }
              ]
            },
            renameOutput: true
          },
          {
            outputKey: 'PDF',
            conditions: {
              options: {
                version: 2,
                leftValue: '',
                caseSensitive: true,
                typeValidation: 'strict'
              },
              combinator: 'and',
              conditions: [
                {
                  id: 'ffaef210-47b6-43d3-9a87-e6e5107794c4',
                  operator: {
                    name: 'filter.operator.equals',
                    type: 'string',
                    operation: 'equals'
                  },
                  leftValue: '={{ $json[\'File Type\'] }}',
                  rightValue: 'PDF'
                }
              ]
            },
            renameOutput: true
          },
          {
            outputKey: 'DOCX',
            conditions: {
              options: {
                version: 2,
                leftValue: '',
                caseSensitive: true,
                typeValidation: 'strict'
              },
              combinator: 'and',
              conditions: [
                {
                  id: 'a876889c-ed2e-4174-9749-229bcecb91c1',
                  operator: {
                    name: 'filter.operator.equals',
                    type: 'string',
                    operation: 'equals'
                  },
                  leftValue: '={{ $json[\'File Type\'] }}',
                  rightValue: 'DOCX'
                }
              ]
            },
            renameOutput: true
          },
          {
            outputKey: 'XLSX',
            conditions: {
              options: {
                version: 2,
                leftValue: '',
                caseSensitive: true,
                typeValidation: 'strict'
              },
              combinator: 'and',
              conditions: [
                {
                  id: '20640093-4536-40e6-a2d1-c105d6ab54e1',
                  operator: {
                    name: 'filter.operator.equals',
                    type: 'string',
                    operation: 'equals'
                  },
                  leftValue: '={{ $json[\'File Type\'] }}',
                  rightValue: 'XLSX'
                }
              ]
            },
            renameOutput: true
          }
        ]
      },
      options: {}
    } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 1, config: { parameters: {
      jsCode: '// Funzione ricorsiva per cercare file_id in oggetti nested\nfunction findFileId(obj, visited = new Set()) {\n  // Evita loop infiniti con riferimenti circolari\n  if (visited.has(obj)) return null;\n  \n  if (obj && typeof obj === \'object\') {\n    visited.add(obj);\n    \n    // Controlla se l\'oggetto corrente ha file_id\n    if (obj.file_id) return obj.file_id;\n    if (obj.fileId) return obj.fileId;\n    if (obj.id && typeof obj.id === \'string\' && obj.id.startsWith(\'file-\')) return obj.id;\n    \n    // Cerca in tutti i valori dell\'oggetto\n    for (const key in obj) {\n      if (obj.hasOwnProperty(key)) {\n        const result = findFileId(obj[key], visited);\n        if (result) return result;\n      }\n    }\n  }\n  \n  return null;\n}\n\n// Estrai file_id da ogni item\nconst output = [];\n\nfor (const item of $input.all()) {\n  let fileId = null;\n  \n  // Strategia 1: Controlla posizioni comuni\n  if (item.json.file_id) {\n    fileId = item.json.file_id;\n  } \n  else if (item.json.data?.file_id) {\n    fileId = item.json.data.file_id;\n  }\n  else if (item.json.result?.file_id) {\n    fileId = item.json.result.file_id;\n  }\n  else if (item.json.response?.file_id) {\n    fileId = item.json.response.file_id;\n  }\n  else if (item.json.output?.file_id) {\n    fileId = item.json.output.file_id;\n  }\n  // Cerca in attachments array\n  else if (Array.isArray(item.json.attachments) && item.json.attachments.length > 0) {\n    fileId = item.json.attachments[0].file_id || item.json.attachments[0].id;\n  }\n  // Cerca in files array\n  else if (Array.isArray(item.json.files) && item.json.files.length > 0) {\n    fileId = item.json.files[0].file_id || item.json.files[0].id;\n  }\n  // Strategia 2: Ricerca ricorsiva in tutto l\'oggetto\n  else {\n    fileId = findFileId(item.json);\n  }\n  \n  // Strategia 3: Cerca nel binary data\n  if (!fileId && item.binary) {\n    for (const binaryKey in item.binary) {\n      if (item.binary[binaryKey].id) {\n        fileId = item.binary[binaryKey].id;\n        break;\n      }\n    }\n  }\n  \n  output.push({\n    json: {\n      file_id: fileId\n    }\n  });\n}\n\nreturn output;'
    }, position: [1168, -32], name: 'Extract PPTX file_id' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.1, config: { parameters: {
      url: '=https://api.anthropic.com/v1/files/{{ $json.file_id }}/content ',
      options: { response: { response: { responseFormat: 'file' } } },
      sendHeaders: true,
      headerParameters: {
        parameters: [
          {
            name: 'x-api-key',
            value: 'sk-YOUR_OPENAI_KEY_HERE-api03--1Sm0GNaBpPVkBc4avVv45p6afHjoLWivKC3KZqjyaQc4ZcRG4mVhU5CNoOBxKeJogHhl2gFxmIwFU1ZhVkhiQ-egvBeAAA'
          },
          { name: 'anthropic-version', value: '2023-06-01' },
          { name: 'anthropic-beta', value: 'files-api-2025-04-14' }
        ]
      }
    }, position: [1376, -32], name: 'Download PPTX' } }))
  .then(node({ type: 'n8n-nodes-base.googleDrive', version: 3, config: { parameters: {
      name: '={{ $binary.data.fileName}}',
      driveId: { __rl: true, mode: 'list', value: 'My Drive' },
      options: {},
      folderId: {
        __rl: true,
        mode: 'list',
        value: '1tkCr7xdraoZwsHqeLm7FZ4aRWY94oLbZ',
        cachedResultUrl: 'https://drive.google.com/drive/folders/1tkCr7xdraoZwsHqeLm7FZ4aRWY94oLbZ',
        cachedResultName: 'n8n'
      }
    }, credentials: {
      googleDriveOAuth2Api: {
        id: 'credential-id',
        name: 'googleDriveOAuth2Api Credential'
      }
    }, position: [1584, -32], name: 'Upload PPTX' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 1, config: { parameters: {
      jsCode: '// Funzione ricorsiva per cercare file_id in oggetti nested\nfunction findFileId(obj, visited = new Set()) {\n  // Evita loop infiniti con riferimenti circolari\n  if (visited.has(obj)) return null;\n  \n  if (obj && typeof obj === \'object\') {\n    visited.add(obj);\n    \n    // Controlla se l\'oggetto corrente ha file_id\n    if (obj.file_id) return obj.file_id;\n    if (obj.fileId) return obj.fileId;\n    if (obj.id && typeof obj.id === \'string\' && obj.id.startsWith(\'file-\')) return obj.id;\n    \n    // Cerca in tutti i valori dell\'oggetto\n    for (const key in obj) {\n      if (obj.hasOwnProperty(key)) {\n        const result = findFileId(obj[key], visited);\n        if (result) return result;\n      }\n    }\n  }\n  \n  return null;\n}\n\n// Estrai file_id da ogni item\nconst output = [];\n\nfor (const item of $input.all()) {\n  let fileId = null;\n  \n  // Strategia 1: Controlla posizioni comuni\n  if (item.json.file_id) {\n    fileId = item.json.file_id;\n  } \n  else if (item.json.data?.file_id) {\n    fileId = item.json.data.file_id;\n  }\n  else if (item.json.result?.file_id) {\n    fileId = item.json.result.file_id;\n  }\n  else if (item.json.response?.file_id) {\n    fileId = item.json.response.file_id;\n  }\n  else if (item.json.output?.file_id) {\n    fileId = item.json.output.file_id;\n  }\n  // Cerca in attachments array\n  else if (Array.isArray(item.json.attachments) && item.json.attachments.length > 0) {\n    fileId = item.json.attachments[0].file_id || item.json.attachments[0].id;\n  }\n  // Cerca in files array\n  else if (Array.isArray(item.json.files) && item.json.files.length > 0) {\n    fileId = item.json.files[0].file_id || item.json.files[0].id;\n  }\n  // Strategia 2: Ricerca ricorsiva in tutto l\'oggetto\n  else {\n    fileId = findFileId(item.json);\n  }\n  \n  // Strategia 3: Cerca nel binary data\n  if (!fileId && item.binary) {\n    for (const binaryKey in item.binary) {\n      if (item.binary[binaryKey].id) {\n        fileId = item.binary[binaryKey].id;\n        break;\n      }\n    }\n  }\n  \n  output.push({\n    json: {\n      file_id: fileId\n    }\n  });\n}\n\nreturn output;'
    }, position: [1168, 208], name: 'Extract PDF file_id' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.1, config: { parameters: {
      url: '=https://api.anthropic.com/v1/files/{{ $json.file_id }}/content',
      options: { response: { response: { responseFormat: 'file' } } },
      sendHeaders: true,
      headerParameters: {
        parameters: [
          {
            name: 'x-api-key',
            value: 'sk-YOUR_OPENAI_KEY_HERE-api03--1Sm0GNaBpPVkBc4avVv45p6afHjoLWivKC3KZqjyaQc4ZcRG4mVhU5CNoOBxKeJogHhl2gFxmIwFU1ZhVkhiQ-egvBeAAA'
          },
          { name: 'anthropic-version', value: '2023-06-01' },
          { name: 'anthropic-beta', value: 'files-api-2025-04-14' }
        ]
      }
    }, position: [1376, 208], name: 'Download PDF' } }))
  .then(node({ type: 'n8n-nodes-base.googleDrive', version: 3, config: { parameters: {
      name: '={{ $binary.data.fileName}}',
      driveId: { __rl: true, mode: 'list', value: 'My Drive' },
      options: {},
      folderId: {
        __rl: true,
        mode: 'list',
        value: '1tkCr7xdraoZwsHqeLm7FZ4aRWY94oLbZ',
        cachedResultUrl: 'https://drive.google.com/drive/folders/1tkCr7xdraoZwsHqeLm7FZ4aRWY94oLbZ',
        cachedResultName: 'n8n'
      }
    }, credentials: {
      googleDriveOAuth2Api: {
        id: 'credential-id',
        name: 'googleDriveOAuth2Api Credential'
      }
    }, position: [1584, 208], name: 'Upload PDF' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 1, config: { parameters: {
      jsCode: '// Funzione ricorsiva per cercare file_id in oggetti nested\nfunction findFileId(obj, visited = new Set()) {\n  // Evita loop infiniti con riferimenti circolari\n  if (visited.has(obj)) return null;\n  \n  if (obj && typeof obj === \'object\') {\n    visited.add(obj);\n    \n    // Controlla se l\'oggetto corrente ha file_id\n    if (obj.file_id) return obj.file_id;\n    if (obj.fileId) return obj.fileId;\n    if (obj.id && typeof obj.id === \'string\' && obj.id.startsWith(\'file-\')) return obj.id;\n    \n    // Cerca in tutti i valori dell\'oggetto\n    for (const key in obj) {\n      if (obj.hasOwnProperty(key)) {\n        const result = findFileId(obj[key], visited);\n        if (result) return result;\n      }\n    }\n  }\n  \n  return null;\n}\n\n// Estrai file_id da ogni item\nconst output = [];\n\nfor (const item of $input.all()) {\n  let fileId = null;\n  \n  // Strategia 1: Controlla posizioni comuni\n  if (item.json.file_id) {\n    fileId = item.json.file_id;\n  } \n  else if (item.json.data?.file_id) {\n    fileId = item.json.data.file_id;\n  }\n  else if (item.json.result?.file_id) {\n    fileId = item.json.result.file_id;\n  }\n  else if (item.json.response?.file_id) {\n    fileId = item.json.response.file_id;\n  }\n  else if (item.json.output?.file_id) {\n    fileId = item.json.output.file_id;\n  }\n  // Cerca in attachments array\n  else if (Array.isArray(item.json.attachments) && item.json.attachments.length > 0) {\n    fileId = item.json.attachments[0].file_id || item.json.attachments[0].id;\n  }\n  // Cerca in files array\n  else if (Array.isArray(item.json.files) && item.json.files.length > 0) {\n    fileId = item.json.files[0].file_id || item.json.files[0].id;\n  }\n  // Strategia 2: Ricerca ricorsiva in tutto l\'oggetto\n  else {\n    fileId = findFileId(item.json);\n  }\n  \n  // Strategia 3: Cerca nel binary data\n  if (!fileId && item.binary) {\n    for (const binaryKey in item.binary) {\n      if (item.binary[binaryKey].id) {\n        fileId = item.binary[binaryKey].id;\n        break;\n      }\n    }\n  }\n  \n  output.push({\n    json: {\n      file_id: fileId\n    }\n  });\n}\n\nreturn output;'
    }, position: [1168, 448], name: 'Extract DOCX file_id' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.1, config: { parameters: {
      url: '=https://api.anthropic.com/v1/files/{{ $json.file_id }}/content',
      options: { response: { response: { responseFormat: 'file' } } },
      sendHeaders: true,
      headerParameters: {
        parameters: [
          {
            name: 'x-api-key',
            value: 'sk-YOUR_OPENAI_KEY_HERE-api03--1Sm0GNaBpPVkBc4avVv45p6afHjoLWivKC3KZqjyaQc4ZcRG4mVhU5CNoOBxKeJogHhl2gFxmIwFU1ZhVkhiQ-egvBeAAA'
          },
          { name: 'anthropic-version', value: '2023-06-01' },
          { name: 'anthropic-beta', value: 'files-api-2025-04-14' }
        ]
      }
    }, position: [1376, 448], name: 'Download DOCX' } }))
  .then(node({ type: 'n8n-nodes-base.googleDrive', version: 3, config: { parameters: {
      name: '={{ $binary.data.fileName}}',
      driveId: { __rl: true, mode: 'list', value: 'My Drive' },
      options: {},
      folderId: {
        __rl: true,
        mode: 'list',
        value: '1tkCr7xdraoZwsHqeLm7FZ4aRWY94oLbZ',
        cachedResultUrl: 'https://drive.google.com/drive/folders/1tkCr7xdraoZwsHqeLm7FZ4aRWY94oLbZ',
        cachedResultName: 'n8n'
      }
    }, credentials: {
      googleDriveOAuth2Api: {
        id: 'credential-id',
        name: 'googleDriveOAuth2Api Credential'
      }
    }, position: [1584, 448], name: 'Upload DOCX' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 1, config: { parameters: {
      jsCode: '// Funzione ricorsiva per cercare file_id in oggetti nested\nfunction findFileId(obj, visited = new Set()) {\n  // Evita loop infiniti con riferimenti circolari\n  if (visited.has(obj)) return null;\n  \n  if (obj && typeof obj === \'object\') {\n    visited.add(obj);\n    \n    // Controlla se l\'oggetto corrente ha file_id\n    if (obj.file_id) return obj.file_id;\n    if (obj.fileId) return obj.fileId;\n    if (obj.id && typeof obj.id === \'string\' && obj.id.startsWith(\'file-\')) return obj.id;\n    \n    // Cerca in tutti i valori dell\'oggetto\n    for (const key in obj) {\n      if (obj.hasOwnProperty(key)) {\n        const result = findFileId(obj[key], visited);\n        if (result) return result;\n      }\n    }\n  }\n  \n  return null;\n}\n\n// Estrai file_id da ogni item\nconst output = [];\n\nfor (const item of $input.all()) {\n  let fileId = null;\n  \n  // Strategia 1: Controlla posizioni comuni\n  if (item.json.file_id) {\n    fileId = item.json.file_id;\n  } \n  else if (item.json.data?.file_id) {\n    fileId = item.json.data.file_id;\n  }\n  else if (item.json.result?.file_id) {\n    fileId = item.json.result.file_id;\n  }\n  else if (item.json.response?.file_id) {\n    fileId = item.json.response.file_id;\n  }\n  else if (item.json.output?.file_id) {\n    fileId = item.json.output.file_id;\n  }\n  // Cerca in attachments array\n  else if (Array.isArray(item.json.attachments) && item.json.attachments.length > 0) {\n    fileId = item.json.attachments[0].file_id || item.json.attachments[0].id;\n  }\n  // Cerca in files array\n  else if (Array.isArray(item.json.files) && item.json.files.length > 0) {\n    fileId = item.json.files[0].file_id || item.json.files[0].id;\n  }\n  // Strategia 2: Ricerca ricorsiva in tutto l\'oggetto\n  else {\n    fileId = findFileId(item.json);\n  }\n  \n  // Strategia 3: Cerca nel binary data\n  if (!fileId && item.binary) {\n    for (const binaryKey in item.binary) {\n      if (item.binary[binaryKey].id) {\n        fileId = item.binary[binaryKey].id;\n        break;\n      }\n    }\n  }\n  \n  output.push({\n    json: {\n      file_id: fileId\n    }\n  });\n}\n\nreturn output;'
    }, position: [1168, 688], name: 'Extract XLSX file_id' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.1, config: { parameters: {
      url: '=https://api.anthropic.com/v1/files/{{ $json.file_id }}/content',
      options: { response: { response: { responseFormat: 'file' } } },
      sendHeaders: true,
      headerParameters: {
        parameters: [
          {
            name: 'x-api-key',
            value: 'sk-YOUR_OPENAI_KEY_HERE-api03--1Sm0GNaBpPVkBc4avVv45p6afHjoLWivKC3KZqjyaQc4ZcRG4mVhU5CNoOBxKeJogHhl2gFxmIwFU1ZhVkhiQ-egvBeAAA'
          },
          { name: 'anthropic-version', value: '2023-06-01' },
          { name: 'anthropic-beta', value: 'files-api-2025-04-14' }
        ]
      }
    }, position: [1376, 688], name: 'Download XLSX' } }))
  .then(node({ type: 'n8n-nodes-base.googleDrive', version: 3, config: { parameters: {
      name: '={{ $binary.data.fileName}}',
      driveId: { __rl: true, mode: 'list', value: 'My Drive' },
      options: {},
      folderId: {
        __rl: true,
        mode: 'list',
        value: '1tkCr7xdraoZwsHqeLm7FZ4aRWY94oLbZ',
        cachedResultUrl: 'https://drive.google.com/drive/folders/1tkCr7xdraoZwsHqeLm7FZ4aRWY94oLbZ',
        cachedResultName: 'n8n'
      }
    }, credentials: {
      googleDriveOAuth2Api: {
        id: 'credential-id',
        name: 'googleDriveOAuth2Api Credential'
      }
    }, position: [1584, 688], name: 'Upload XLSX' } }))
  .add(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://api.anthropic.com/v1/skills',
      options: {},
      sendHeaders: true,
      authentication: 'genericCredentialType',
      genericAuthType: 'httpHeaderAuth',
      headerParameters: {
        parameters: [
          { name: 'anthropic-version', value: '2023-06-01' },
          { name: 'anthropic-beta', value: 'skills-2025-10-02' }
        ]
      }
    }, credentials: {
      httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' }
    }, position: [480, -80], name: 'Get All Skills' } }))
  .add(sticky('## STEP 1\n- In the HTTP Node, add the Auth Header:\nName: **x-api-key**\nValue: **YOUR_ANTHROPIC_API_KEY**\n\n- Get the list of all the skills currently created on your Anthropic account and Switch based on the file type selected: Excel, Word, PDF, Power Point\n\n\n', { name: 'Sticky Note6', color: 7, position: [320, -304], width: 560, height: 1296 }))
  .add(sticky('## STEP 2\n- Create the desired PowerPoint, PDF, Word and Excel file and download it locally using the file_id field.', { name: 'Sticky Note', color: 7, position: [912, -304], width: 592, height: 1296 }))
  .add(sticky('## Using Anthropic Agent Skills with the API and Uploading to Google Drive\nAgent Skills extend Claude’s capabilities through organized folders of instructions, scripts, and resources. This guide shows you how to use both pre-built and custom Skills with the Claude API.\n\nThis workflow automates the process of generating, downloading, and storing professionally formatted files (PDF, DOCX, PPTX, XLSX) using the **Anthropic Claude API** and **Google Drive**.\n\nThis workflow connects user prompts with the Anthropic API to generate professional documents in multiple formats, automatically retrieves and uploads them to Google Drive — providing a complete AI-powered document automation system.\n\n## **How it works:**\nThe workflow takes a user prompt from a form, routes it by file type, and uses Anthropic’s Messages API to generate documents (PPTX, PDF, DOCX, XLSX). It extracts file IDs, downloads the files, and uploads them to Google Drive automatically.\n\n## **Setup steps:**\nAuthenticate Anthropic API and Google Drive, set folder IDs, and configure headers. Optionally add custom skills, then activate the workflow and use the form to generate and store AI-created documents.\n\n\n', { name: 'Sticky Note1', position: [320, -800], width: 912, height: 464 }))
  .add(sticky('## STEP 3\n- Connect Google Drive\n', { name: 'Sticky Note2', color: 7, position: [1536, -304], width: 272, height: 1296 }))