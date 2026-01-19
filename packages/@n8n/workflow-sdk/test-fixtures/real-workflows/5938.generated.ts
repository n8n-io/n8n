return workflow('', '')
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { position: [-1320, -100], name: 'When clicking ‘Execute workflow’' } }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4.6, config: { parameters: {
      options: {},
      sheetName: {
        __rl: true,
        mode: 'list',
        value: 'gid=0',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1nYii2KQDrKZNUPbLJ6r2ogNnGGZggJOJR6b6CGM3slY/edit#gid=0',
        cachedResultName: 'Leads'
      },
      documentId: {
        __rl: true,
        mode: 'list',
        value: '1nYii2KQDrKZNUPbLJ6r2ogNnGGZggJOJR6b6CGM3slY',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1nYii2KQDrKZNUPbLJ6r2ogNnGGZggJOJR6b6CGM3slY/edit?usp=drivesdk',
        cachedResultName: 'Leads To Sales'
      }
    }, credentials: {
      googleSheetsOAuth2Api: {
        id: 'credential-id',
        name: 'googleSheetsOAuth2Api Credential'
      }
    }, position: [-1100, -100], name: 'Get row(s) in sheet' } }))
  .then(ifBranch([node({ type: 'n8n-nodes-base.splitInBatches', version: 3, config: { parameters: { options: {} }, position: [-580, -40], name: 'Loop Over Items1' } }), null], { version: 2.2, parameters: {
      options: {},
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
            id: 'f9f45046-3aac-41f1-939d-3269646e542f',
            operator: { type: 'string', operation: 'empty', singleValue: true },
            leftValue: '={{ $json["Hasil Riset"] }}',
            rightValue: ''
          }
        ]
      }
    }, name: 'If1' }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 2, config: { parameters: {
      text: '=You are an expert business analyst. Your task is to research the company: {{ $json.Perusahaan }}.\n\nYour output must be a comprehensive description that identifies the company\'s name, its core business, and potential opportunities for improving efficiency and effectiveness by implementing AI solutions.\n\nUse the \'Search Internet\' tool to gather the latest information.\n\nStrictly base your analysis on the data found through the internet search. Do not hallucinate or invent information.\n\nYour final output must be only the text description. Do not include any introductory sentences or greetings.',
      options: {},
      promptType: 'define'
    }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatGroq', version: 1, config: { parameters: { options: {} }, credentials: {
          groqApi: { id: 'credential-id', name: 'groqApi Credential' }
        }, name: 'Groq Chat Model1' } }), tools: [tool({ type: '@tavily/n8n-nodes-tavily.tavilyTool', version: 1, config: { parameters: {
          query: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Query\', ``, \'string\') }}',
          options: {},
          descriptionType: 'manual',
          toolDescription: 'Get latest news/description on topic that user want to reseaarch'
        }, credentials: {
          tavilyApi: { id: 'credential-id', name: 'tavilyApi Credential' }
        }, name: 'Search Internet1' } })] }, position: [-360, -40], name: 'Company Research1' } }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4.6, config: { parameters: {
      columns: {
        value: {
          Perusahaan: '={{ $(\'If1\').item.json.Perusahaan }}',
          'Hasil Riset': '={{ $json.output }}'
        },
        schema: [
          {
            id: 'Nama',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Nama',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Jabatan',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Jabatan',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Email',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Email',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Perusahaan',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'Perusahaan',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Hasil Riset',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Hasil Riset',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Status',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'Status',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Send Email Perkenalan',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'Send Email Perkenalan',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Kirim email',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'Kirim email',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Respon Email Perkenalan',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'Respon Email Perkenalan',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Send email Follow up 1',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'Send email Follow up 1',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Respon Email Follow up 1',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'Respon Email Follow up 1',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Send email Follow up 2',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'Send email Follow up 2',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Respon Email Follow up 2',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'Respon Email Follow up 2',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'row_number',
            type: 'string',
            display: true,
            removed: true,
            readOnly: true,
            required: false,
            displayName: 'row_number',
            defaultMatch: false,
            canBeUsedToMatch: true
          }
        ],
        mappingMode: 'defineBelow',
        matchingColumns: ['Perusahaan'],
        attemptToConvertTypes: false,
        convertFieldsToString: false
      },
      options: {},
      operation: 'update',
      sheetName: {
        __rl: true,
        mode: 'list',
        value: 'gid=0',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1nYii2KQDrKZNUPbLJ6r2ogNnGGZggJOJR6b6CGM3slY/edit#gid=0',
        cachedResultName: 'Leads'
      },
      documentId: {
        __rl: true,
        mode: 'list',
        value: '1nYii2KQDrKZNUPbLJ6r2ogNnGGZggJOJR6b6CGM3slY',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1nYii2KQDrKZNUPbLJ6r2ogNnGGZggJOJR6b6CGM3slY/edit?usp=drivesdk',
        cachedResultName: 'Leads To Sales'
      }
    }, credentials: {
      googleSheetsOAuth2Api: {
        id: 'credential-id',
        name: 'googleSheetsOAuth2Api Credential'
      }
    }, position: [-20, -40], name: 'updateDescription' } }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4.6, config: { parameters: {
      columns: {
        value: {
          Status: 'Leads',
          Perusahaan: '={{ $(\'If1\').item.json.Perusahaan }}'
        },
        schema: [
          {
            id: 'Nama',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Nama',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Jabatan',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Jabatan',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Email',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Email',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Perusahaan',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'Perusahaan',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Hasil Riset',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Hasil Riset',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Status',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Status',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Send Email Perkenalan',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'Send Email Perkenalan',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Kirim email',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'Kirim email',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Respon Email Perkenalan',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'Respon Email Perkenalan',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Send email Follow up 1',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'Send email Follow up 1',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Respon Email Follow up 1',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'Respon Email Follow up 1',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Send email Follow up 2',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'Send email Follow up 2',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Respon Email Follow up 2',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'Respon Email Follow up 2',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'row_number',
            type: 'string',
            display: true,
            removed: true,
            readOnly: true,
            required: false,
            displayName: 'row_number',
            defaultMatch: false,
            canBeUsedToMatch: true
          }
        ],
        mappingMode: 'defineBelow',
        matchingColumns: ['Perusahaan'],
        attemptToConvertTypes: false,
        convertFieldsToString: false
      },
      options: {},
      operation: 'update',
      sheetName: {
        __rl: true,
        mode: 'list',
        value: 'gid=0',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1nYii2KQDrKZNUPbLJ6r2ogNnGGZggJOJR6b6CGM3slY/edit#gid=0',
        cachedResultName: 'Leads'
      },
      documentId: {
        __rl: true,
        mode: 'list',
        value: '1nYii2KQDrKZNUPbLJ6r2ogNnGGZggJOJR6b6CGM3slY',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1nYii2KQDrKZNUPbLJ6r2ogNnGGZggJOJR6b6CGM3slY/edit?usp=drivesdk',
        cachedResultName: 'Leads To Sales'
      }
    }, credentials: {
      googleSheetsOAuth2Api: {
        id: 'credential-id',
        name: 'googleSheetsOAuth2Api Credential'
      }
    }, position: [180, -40], name: 'updateStatus' } }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4.6, config: { parameters: {
      options: {},
      filtersUI: {
        values: [
          { lookupValue: '={{ $json.Status }}', lookupColumn: 'Tahap' }
        ]
      },
      sheetName: {
        __rl: true,
        mode: 'list',
        value: 102550433,
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1nYii2KQDrKZNUPbLJ6r2ogNnGGZggJOJR6b6CGM3slY/edit#gid=102550433',
        cachedResultName: 'Template'
      },
      documentId: {
        __rl: true,
        mode: 'list',
        value: '1nYii2KQDrKZNUPbLJ6r2ogNnGGZggJOJR6b6CGM3slY',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1nYii2KQDrKZNUPbLJ6r2ogNnGGZggJOJR6b6CGM3slY/edit?usp=drivesdk',
        cachedResultName: 'Leads To Sales'
      }
    }, credentials: {
      googleSheetsOAuth2Api: {
        id: 'credential-id',
        name: 'googleSheetsOAuth2Api Credential'
      }
    }, position: [-520, 540], name: 'getTemplate' } }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4.6, config: { parameters: {
      options: {},
      sheetName: {
        __rl: true,
        mode: 'list',
        value: 1197995458,
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1nYii2KQDrKZNUPbLJ6r2ogNnGGZggJOJR6b6CGM3slY/edit#gid=1197995458',
        cachedResultName: 'List Product'
      },
      documentId: {
        __rl: true,
        mode: 'list',
        value: '1nYii2KQDrKZNUPbLJ6r2ogNnGGZggJOJR6b6CGM3slY',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1nYii2KQDrKZNUPbLJ6r2ogNnGGZggJOJR6b6CGM3slY/edit?usp=drivesdk',
        cachedResultName: 'Leads To Sales'
      }
    }, credentials: {
      googleSheetsOAuth2Api: {
        id: 'credential-id',
        name: 'googleSheetsOAuth2Api Credential'
      }
    }, position: [-360, 540], name: 'getService' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 2, config: { parameters: {
      text: '=You are an expert AI Sales Assistant, tasked with drafting a personalized and relevant email based on the provided data and additional research.\n\n1. PRIMARY CONTEXT (Based on Provided Data):\nSender\'s Company: Ainabler.com (IT consulting firm specializing in AI & Automation).\nSender\'s Name: Hanif R (Technical Sales).\nTarget Company: {{ $(\'If1\').item.json.Perusahaan }}\nTarget Recipient: {{ $(\'If1\').item.json.Nama }}\nRecipient\'s Position: {{ $(\'If1\').item.json.Jabatan }}\nSales Stage: {{ $(\'getTemplate\').item.json.Tahap }}\nMain Email Theme: {{ $(\'getTemplate\').item.json.Tema }}\nKey Information: {{ $(\'Company Research1\').item.json.output }}\nSample Message (For inspiration, not a rigid template): {{ $(\'getTemplate\').item.json[\'Contoh message\'] }}\nToday\'s Date: {{ $now }}\n\n2. ADDITIONAL RESEARCH TASK (Use Search Internet2):\nBefore writing the email, use Search Internet2 to find one or two recent facts/statistics (from 2024-2025) relevant to the recipient\'s position and their industry. The goal is to add a strong, data-driven \'hook\' to make the email opening compelling.\nExample Research Direction: Based on the position \'{{ $(\'If1\').item.json.Jabatan }}\', formulate a smart search query.\n- If the position is related to ESG, search for: "ESG reporting challenges Indonesian banking 2025"\n- If the position is related to Digital/Operations, search for: "AI adoption statistics in Southeast Asia financial sector"\n\n3. FINAL TASK: DRAFT THE EMAIL\nUse ALL the information above (Primary Context + Additional Research) to create one email draft.\n- Personalization: Mention the recipient\'s company name and position to show this is not a mass email.\n- Relevance: Connect the industry challenges (discovered from your research) with the solutions offered by Ainabler.com.\n- Value Proposition: Craft a natural and seamless offer based on our services and the target\'s business line. Adapt from the sample message, but do not be rigid.\n- Call to Action: Propose a brief discussion to explore possibilities.\n\n4. OUTPUT FORMAT (MANDATORY):\nYour final response MUST be a single, valid JSON object. Do not include any text, introductions, or closings outside of this JSON object.\n\n{\n  "emailSubject": "A compelling and specific email subject",\n  "emailBody": "The complete, personalized, and relevant email body."\n}',
      options: {},
      promptType: 'define',
      hasOutputParser: true
    }, subnodes: { model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatGroq', version: 1, config: { parameters: { options: {} }, credentials: {
          groqApi: { id: 'credential-id', name: 'groqApi Credential' }
        }, name: 'Groq Chat Model' } }), tools: [tool({ type: '@tavily/n8n-nodes-tavily.tavilyTool', version: 1, config: { parameters: {
          query: '={{ /*n8n-auto-generated-fromAI-override*/ $fromAI(\'Query\', ``, \'string\') }}',
          options: {},
          descriptionType: 'manual',
          toolDescription: 'Get latest news/description on topic that user want to reseaarch'
        }, credentials: {
          tavilyApi: { id: 'credential-id', name: 'tavilyApi Credential' }
        }, name: 'Search Internet2' } })], outputParser: outputParser({ type: '@n8n/n8n-nodes-langchain.outputParserStructured', version: 1.3, config: { parameters: {
          jsonSchemaExample: '{\n    "emailSubject":"Subject email ",\n    "emailBody": "body email lengkap"\n}'
        }, name: 'Structured Output Parser1' } }) }, position: [-180, 540], name: 'AI Sales Assistant' } }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4.6, config: { parameters: {
      columns: {
        value: {
          Perusahaan: '={{ $(\'If1\').item.json.Perusahaan }}',
          'Send Email Perkenalan': '={{ $json.output }}'
        },
        schema: [
          {
            id: 'Nama',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Nama',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Jabatan',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Jabatan',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Email',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Email',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Perusahaan',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'Perusahaan',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Hasil Riset',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Hasil Riset',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Status',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Status',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Send Email Perkenalan',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Send Email Perkenalan',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Kirim email',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'Kirim email',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Respon Email Perkenalan',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Respon Email Perkenalan',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Send email Follow up 1',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Send email Follow up 1',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Respon Email Follow up 1',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Respon Email Follow up 1',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Send email Follow up 2',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Send email Follow up 2',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Respon Email Follow up 2',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Respon Email Follow up 2',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'row_number',
            type: 'string',
            display: true,
            removed: true,
            readOnly: true,
            required: false,
            displayName: 'row_number',
            defaultMatch: false,
            canBeUsedToMatch: true
          }
        ],
        mappingMode: 'defineBelow',
        matchingColumns: ['Perusahaan'],
        attemptToConvertTypes: false,
        convertFieldsToString: false
      },
      options: {},
      operation: 'update',
      sheetName: { __rl: true, mode: 'id', value: '=gid=0' },
      documentId: {
        __rl: true,
        mode: 'list',
        value: '1nYii2KQDrKZNUPbLJ6r2ogNnGGZggJOJR6b6CGM3slY',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1nYii2KQDrKZNUPbLJ6r2ogNnGGZggJOJR6b6CGM3slY/edit?usp=drivesdk',
        cachedResultName: 'Leads To Sales'
      }
    }, credentials: {
      googleSheetsOAuth2Api: {
        id: 'credential-id',
        name: 'googleSheetsOAuth2Api Credential'
      }
    }, position: [120, 540], name: 'draftEmail' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: '// Array untuk menampung hasil yang akan dikirim ke node selanjutnya\nconst outputItems = [];\n\n// Loop melalui setiap item yang masuk dari node sebelumnya\nfor (const item of items) {\n  try {\n    // 1. Ambil nama perusahaan dari object JSON\n    // Pastikan key \'Perusahaan\' ada di dalam data Anda\n    const namaPerusahaan = item.json.Perusahaan;\n\n    // 2. Lakukan replace spasi dengan \'%20\'\n    // Menggunakan encodeURIComponent() adalah cara yang paling tepat dan aman\n    // untuk mempersiapkan string sebagai bagian dari URL.\n    // Ini tidak hanya mengganti spasi, tapi juga karakter spesial lainnya.\n    const namaPerusahaanEncoded = encodeURIComponent(namaPerusahaan);\n\n    // Alternatif jika Anda HANYA ingin mengganti spasi:\n    // const namaPerusahaanEncoded = namaPerusahaan.replace(/ /g, \'%20\');\n\n    // 3. Buat object baru untuk output\n    // Anda bisa menyertakan data asli jika perlu dengan \'...item.json\'\n    const outputData = {\n      ...item.json, // Menyalin semua data asli\n      perusahaan_url_encoded: namaPerusahaanEncoded // Menambahkan field baru dengan hasil replace\n    };\n\n    // Tambahkan hasil ke dalam array output\n    outputItems.push({ json: outputData });\n\n  } catch (error) {\n    // Jika terjadi error (misalnya key \'Perusahaan\' tidak ditemukan),\n    // teruskan item tersebut tanpa perubahan untuk menghindari workflow berhenti.\n    outputItems.push(item);\n  }\n}\n\n// Kembalikan semua item yang telah diproses untuk digunakan oleh node selanjutnya\nreturn outputItems;'
    }, position: [300, 540] } }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4.6, config: { parameters: {
      columns: {
        value: {
          Perusahaan: '={{ $(\'If1\').item.json.Perusahaan }}',
          'Kirim email': '=https://n8n-brccptxv.ap-southeast-1.clawcloudrun.com/webhook/18169b76-7b07-4fce-95c4-7e5bb6244ed1/send-email/{{ $json.perusahaan_url_encoded }}'
        },
        schema: [
          {
            id: 'Nama',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Nama',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Jabatan',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Jabatan',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Email',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Email',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Perusahaan',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'Perusahaan',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Hasil Riset',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Hasil Riset',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Status',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Status',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Send Email Perkenalan',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Send Email Perkenalan',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Kirim email',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Kirim email',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Respon Email Perkenalan',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Respon Email Perkenalan',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Send email Follow up 1',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Send email Follow up 1',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Respon Email Follow up 1',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Respon Email Follow up 1',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Send email Follow up 2',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Send email Follow up 2',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Respon Email Follow up 2',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Respon Email Follow up 2',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'row_number',
            type: 'string',
            display: true,
            removed: true,
            readOnly: true,
            required: false,
            displayName: 'row_number',
            defaultMatch: false,
            canBeUsedToMatch: true
          }
        ],
        mappingMode: 'defineBelow',
        matchingColumns: ['Perusahaan'],
        attemptToConvertTypes: false,
        convertFieldsToString: false
      },
      options: {},
      operation: 'update',
      sheetName: {
        __rl: true,
        mode: 'list',
        value: 'gid=0',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1nYii2KQDrKZNUPbLJ6r2ogNnGGZggJOJR6b6CGM3slY/edit#gid=0',
        cachedResultName: 'Leads'
      },
      documentId: {
        __rl: true,
        mode: 'list',
        value: '1nYii2KQDrKZNUPbLJ6r2ogNnGGZggJOJR6b6CGM3slY',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1nYii2KQDrKZNUPbLJ6r2ogNnGGZggJOJR6b6CGM3slY/edit?usp=drivesdk',
        cachedResultName: 'Leads To Sales'
      }
    }, credentials: {
      googleSheetsOAuth2Api: {
        id: 'credential-id',
        name: 'googleSheetsOAuth2Api Credential'
      }
    }, position: [480, 540], name: 'inputLink' } }))
  .add(sticky('## Get Leads Data\n*   **Data Source:** The workflow starts by fetching lead data from a **Google Sheet**. This sheet is designed to act as a central hub, likely connected to a **Google Form** where new leads are automatically captured. This architecture is highly flexible; the Google Sheet can be easily replaced with other data sources like a **Supabase** database, **Airtable**, or even be pulled directly from your **CRM**.\n*   **Smart Filter:** Before being processed further, the workflow performs a crucial check using an `If` node. It verifies if the "Research_Result" column for a lead is empty. This is a key efficiency measure to ensure the workflow **only processes new leads** that haven\'t been previously analyzed, preventing duplicate work.', { name: 'Sticky Note', color: 4, position: [-1380, -340], width: 720, height: 380 }))
  .add(sticky('## Company Research\n*   **Individual Processing:** Each qualified lead is then processed individually using the `Loop Over Items` node, ensuring that every research task and the generated email is focused and specific to a single company at a time.\n*   **AI Business Analyst:** The core of this stage is an **AI Agent** (`Company Research1`) assigned the role of an expert business analyst. Its task goes beyond finding general information. Based on a specific *prompt*, the AI is assigned to:\n    *   Identify the target company\'s name and core business model.\n    *   Find the latest and most relevant information about the company.\n    *   **Analyze and identify opportunities** where your company\'s AI and automation services can improve efficiency and effectiveness.\n*   **Accurate & Current Data:** To avoid hallucinations and ensure relevance, the AI Agent is equipped with a **real-time internet search** tool (using `Tavily`). This allows it to access the latest news, reports, and articles about the target company.\n*   **Recording the Results:** The analytical description from the research is automatically inserted back into the Google Sheet under the `Research_Result` column for the corresponding lead. The lead\'s status is also updated to `Researched`, indicating that the research phase is complete and the lead is ready for email generation.\n', { name: 'Sticky Note1', color: 3, position: [-620, -340], width: 1380, height: 540 }))
  .add(sticky('## Generate & Send Lead Email\n*   **Gathering Context:** A second **AI Sales Assistant** ," is activated. This agent gathers various pieces of information to craft the perfect email:\n    *   **Lead Data:** The contact\'s name, position, and company name.\n    *   **Research Results:** The in-depth analysis from the previous stage.\n    *   **Your Services:** A list of the products/services you offer, fetched from the "List Product" sheet.\n    *   **Template & Theme:** The appropriate email template from the "Template" sheet, based on the lead\'s status (e.g., an "Introduction" email).\n*   **Additional Research for a "Hook":** To make the email stand out, the AI performs a **second, more targeted internet search**. The goal is to find a recent statistic or fact (e.g., *"ESG reporting challenges for Indonesian banks in 2025"*) that is highly relevant to the recipient\'s position, which will be used as a powerful opening line (the hook).\n*   **Drafting the Email & CTA:** Using all this context, the AI drafts a complete email—including the *subject* and *body*—that is personalized, relevant, and leads to a clear *Call to Action* (CTA). The result is saved in a structured JSON format in the `Draft_Intro_Email` column.\n*   **The Send Trigger:** The workflow cleverly creates a **unique URL** in the `Send_Email_Link` column. This URL functions as a manual trigger. When you click this link in Google Sheets, it calls a webhook that can be configured to send the email. This provides a layer of *\'human-in-the-loop\'* control, allowing the sales team to review the draft before it\'s sent.', { name: 'Sticky Note2', color: 5, position: [-560, 220], width: 1720, height: 560 }))
  .add(sticky('## Overall Description & Potential\n\n**<< What Does This Flow Do? >>**\n\nOverall, this workflow is an **intelligent sales outreach automation engine** that transforms raw leads from a form or a list into highly personalized, ready-to-send introductory email drafts. The process is: it starts by fetching data, enriches it with in-depth AI research to uncover "pain points," and then uses those research findings to craft an email that is relevant to the solutions you offer.\n\nThis system solves a key problem in sales: the lack of time to conduct in-depth research on every single lead. By automating the research and drafting stages, the sales team can focus on higher-value activities, like engaging with "warm" prospects and handling negotiations. Using Google Sheets as the main dashboard allows the team to monitor the entire process—from lead entry, research status, and email drafts, all the way to the send link—all within a single, familiar interface.\n\n**<< Potential Future Enhancements >>**\n\nThis workflow has a very strong foundation and can be further developed into an even more sophisticated system:\n\n1.  **Full Automation (Zero-Touch):** Instead of generating a manual-click link, the output from the AI Agent can be directly piped into a **Gmail** or **Microsoft 365 Email** node to send emails automatically. A `Wait` node could be added to create a delay of a few minutes or hours after the draft is created, preventing instant sending.\n\n2.  **Automated Follow-up Sequences:** The workflow can be extended to manage follow-up emails. By using a webhook to track email opens or replies, you could build logic like: *"If the intro email is not replied to within 3 days, trigger the AI Agent again to generate follow-up email #1 based on a different template, and then send it."*\n\n3.  **AI-Powered Lead Scoring:** After the research stage, the AI could be given the additional task of **scoring leads** (e.g., 1-10 or High/Medium/Low Priority) based on how well the target company\'s profile matches your ideal customer profile (ICP). This helps the sales team prioritize the most promising leads.\n\n4.  **Full CRM Integration:** Instead of Google Sheets, the workflow could connect directly to **HubSpot, Salesforce, or Pipedrive**. It would pull new leads from the CRM, perform the research, draft the email, and log all activities (research results, sent emails) back to the contact\'s timeline in the CRM automatically.\n\n5.  **Multi-Channel Outreach:** Beyond email, the AI could be instructed to draft personalized **LinkedIn Connection Request** messages or **WhatsApp** messages. The workflow could then use the appropriate APIs to send these messages, expanding your outreach beyond just email.', { name: 'Sticky Note3', color: 7, position: [-1380, 80], width: 720, height: 940 }))