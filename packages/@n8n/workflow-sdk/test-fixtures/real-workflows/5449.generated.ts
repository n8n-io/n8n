return workflow('QIkMJhue2s5le6jM', 'Reranks #1', { executionOrder: 'v1' })
  .add(trigger({ type: 'n8n-nodes-base.googleDriveTrigger', version: 1, config: { parameters: {
      event: 'fileUpdated',
      options: { fileType: 'all' },
      pollTimes: { item: [{ hour: 0 }] },
      triggerOn: 'specificFolder',
      folderToWatch: {
        __rl: true,
        mode: 'list',
        value: '1dh1Rr2yrhSdoSYpiR8s1yXiSWLYxpoLJ',
        cachedResultUrl: 'https://drive.google.com/drive/folders/1dh1Rr2yrhSdoSYpiR8s1yXiSWLYxpoLJ',
        cachedResultName: 'ReCharge'
      }
    }, credentials: {
      googleDriveOAuth2Api: {
        id: 'credential-id',
        name: 'googleDriveOAuth2Api Credential'
      }
    }, position: [3500, 580] } }))
  .then(node({ type: 'n8n-nodes-base.googleDrive', version: 3, config: { parameters: {
      filter: {
        folderId: {
          __rl: true,
          mode: 'list',
          value: '1dh1Rr2yrhSdoSYpiR8s1yXiSWLYxpoLJ',
          cachedResultUrl: 'https://drive.google.com/drive/folders/1dh1Rr2yrhSdoSYpiR8s1yXiSWLYxpoLJ',
          cachedResultName: 'ReCharge'
        }
      },
      options: {},
      resource: 'fileFolder',
      returnAll: true
    }, credentials: {
      googleDriveOAuth2Api: {
        id: 'credential-id',
        name: 'googleDriveOAuth2Api Credential'
      }
    }, position: [3680, 580], name: 'Search File' } }))
  .then(node({ type: 'n8n-nodes-base.googleDrive', version: 3, config: { parameters: {
      fileId: { __rl: true, mode: 'id', value: '={{ $json.id }}' },
      options: {},
      operation: 'download'
    }, credentials: {
      googleDriveOAuth2Api: {
        id: 'credential-id',
        name: 'googleDriveOAuth2Api Credential'
      }
    }, position: [3840, 580], name: 'Get Data' } }))
  .then(node({ type: 'n8n-nodes-base.splitInBatches', version: 3, config: { parameters: { options: {} }, position: [3860, 380], name: 'Loop Over Items' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.vectorStoreSupabase', version: 1.1, config: { parameters: {
      mode: 'insert',
      options: {},
      tableName: {
        __rl: true,
        mode: 'list',
        value: 'documents',
        cachedResultName: 'documents'
      }
    }, credentials: {
      supabaseApi: { id: 'credential-id', name: 'supabaseApi Credential' }
    }, subnodes: { embedding: embedding({ type: '@n8n/n8n-nodes-langchain.embeddingsOpenAi', version: 1.2, config: { parameters: { options: {} }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'Embeddings OpenAI' } }), documentLoader: documentLoader({ type: '@n8n/n8n-nodes-langchain.documentDefaultDataLoader', version: 1, config: { parameters: { options: {}, dataType: 'binary' }, subnodes: { textSplitter: textSplitter({ type: '@n8n/n8n-nodes-langchain.textSplitterRecursiveCharacterTextSplitter', version: 1, config: { parameters: { options: {} }, name: 'Recursive Character Text Splitter' } }) }, name: 'Default Data Loader' } }) }, position: [4080, 380], name: 'Supabase Vector Store' } }))
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { position: [2080, 180], name: 'When clicking ‘Execute workflow’' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: 'e80e3961-4f18-4e38-8642-4c35075f13a1',
            name: 'lokasi',
            type: 'string',
            value: 'Bali'
          }
        ]
      }
    }, position: [2300, 180], name: 'Set Location' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: '<your apify url>',
      method: 'POST',
      options: {},
      jsonBody: '={\n    "includeWebResults": false,\n    "language": "id",\n    "locationQuery": "{{ $json.lokasi }}",\n    "maxCrawledPlacesPerSearch": 500,\n    "maxImages": 0,\n    "maximumLeadsEnrichmentRecords": 0,\n    "scrapeContacts": false,\n    "scrapeDirectories": false,\n    "scrapeImageAuthors": false,\n    "scrapePlaceDetailPage": false,\n    "scrapeReviewsPersonalData": true,\n    "scrapeTableReservationProvider": false,\n    "searchStringsArray": [\n        "Restoran"\n    ],\n    "skipClosedPlaces": false\n}',
      sendBody: true,
      specifyBody: 'json'
    }, position: [2520, 180], name: 'Scrape Maps' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: { url: '<your apify get>', options: {} }, position: [2740, 180], name: 'Get Result' } }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4.6, config: { parameters: {
      columns: {
        value: {
          Phone: '={{ $json.phone ? $json.phone.replace(/[-\\s]/g, \'\') : \'\' }}',
          Price: '={{ $json.price }}',
          Title: '={{ $json.title }}',
          Rating: '={{ $json.totalScore }}',
          Address: '={{ $json.address }}',
          Reviews: '={{ $json.reviewsCount }}',
          Website: '={{ $json.website || "not found" }}',
          Category: '={{ $json.categoryName }}',
          Fasilitas: '={{ $json.additionalInfo.Fasilitas }}',
          Keunggulan: '={{ $json.additionalInfo.Keunggulan }}',
          Pembayaran: '={{ $json.additionalInfo.Pembayaran }}',
          Description: '={{ $json.description }}',
          Neighborhood: '={{ $json.neighborhood }}',
          'Opening Hours': '={{ $json.openingHours }}',
          'All Categories': '={{ $json.categories }}'
        },
        schema: [
          {
            id: 'Title',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Title',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Description',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'Description',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Category',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Category',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Address',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Address',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Phone',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Phone',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Rating',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Rating',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Reviews',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Reviews',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Price',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Price',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Website',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Website',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Neighborhood',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Neighborhood',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Opening Hours',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Opening Hours',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'All Categories',
            type: 'string',
            display: true,
            required: false,
            displayName: 'All Categories',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Keunggulan',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'Keunggulan',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Fasilitas',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'Fasilitas',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Pembayaran',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'Pembayaran',
            defaultMatch: false,
            canBeUsedToMatch: true
          }
        ],
        mappingMode: 'defineBelow',
        matchingColumns: [],
        attemptToConvertTypes: false,
        convertFieldsToString: false
      },
      options: {},
      operation: 'append',
      sheetName: {
        __rl: true,
        mode: 'list',
        value: 'gid=0',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1DKXYqpb0EWNYsbq2x8h5xqUWXy772toNDVrl8d-8nfA/edit#gid=0',
        cachedResultName: 'Restaurant'
      },
      documentId: {
        __rl: true,
        mode: 'url',
        value: 'https://docs.google.com/spreadsheets/d/1DKXYqpb0EWNYsbq2x8h5xqUWXy772toNDVrl8d-8nfA/edit?usp=sharing'
      },
      authentication: 'serviceAccount'
    }, credentials: {
      googleApi: { id: 'credential-id', name: 'googleApi Credential' }
    }, position: [2960, 180], name: 'Append Leads' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: { url: '<your webhook>', options: {} }, position: [3180, 180], name: 'HTTP Request1' } }))
  .add(trigger({ type: 'n8n-nodes-base.webhook', version: 2, config: { parameters: { path: '<your webhook>', options: {} }, position: [2080, 380] } }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4.6, config: { parameters: {
      sheetName: {
        __rl: true,
        mode: 'list',
        value: '',
        cachedResultUrl: '',
        cachedResultName: ''
      },
      documentId: { __rl: true, mode: 'list', value: '' },
      authentication: 'serviceAccount'
    }, credentials: {
      googleApi: { id: 'credential-id', name: 'googleApi Credential' }
    }, position: [2300, 380], name: 'Get Leads' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: '// Bersihkan dan format data dari spreadsheet\nconst cleanData = $input.all().map(item => {\n  const data = item.json;\n  \n  // Parse JSON strings jadi array yang mudah dibaca\n  function parseJsonField(field) {\n    try {\n      if (!field || field === \'not found\') return [];\n      const parsed = JSON.parse(field);\n      if (Array.isArray(parsed)) {\n        return parsed.map(item => {\n          if (typeof item === \'object\') {\n            return Object.keys(item).filter(key => item[key] === true);\n          }\n          return item;\n        }).flat();\n      }\n      return [];\n    } catch {\n      return [];\n    }\n  }\n  \n  // Parse opening hours jadi format mudah dibaca\n  function parseOpeningHours(hoursString) {\n    try {\n      if (!hoursString) return \'Jam buka tidak tersedia\';\n      const hours = JSON.parse(hoursString);\n      return hours.map(h => `${h.day}: ${h.hours}`).join(\', \');\n    } catch {\n      return \'Jam buka tidak tersedia\';\n    }\n  }\n  \n  // Ekstrak data bersih\n  const keunggulan = parseJsonField(data.Keunggulan);\n  const fasilitas = parseJsonField(data.Fasilitas);\n  const pembayaran = parseJsonField(data.Pembayaran);\n  const allCategories = parseJsonField(data[\'All Categories\']);\n  const openingHours = parseOpeningHours(data[\'Opening Hours\']);\n  \n  // Buat deskripsi lengkap untuk AI\n  const businessDescription = `\n${data.Title} adalah ${data.Category} yang berlokasi di ${data.Neighborhood}. \nRating: ${data.Rating}/5 dengan ${data.Reviews} review. \nHarga: ${data.Price || \'Tidak diketahui\'}.\n${data.Description || \'\'}\n\nKeunggulan: ${keunggulan.join(\', \') || \'Tidak ada info keunggulan\'}\nFasilitas: ${fasilitas.join(\', \') || \'Tidak ada info fasilitas\'}  \nMetode Pembayaran: ${pembayaran.join(\', \') || \'Tidak ada info pembayaran\'}\nKategori: ${allCategories.join(\', \') || data.Category}\nJam Buka: ${openingHours}\n\nKontak: ${data.Phone || \'Tidak ada nomor telepon\'}\nWebsite: ${data.Website !== \'not found\' ? data.Website : \'Tidak ada website\'}\nAlamat Lengkap: ${data.Address}\n`.trim();\n\n  // Hitung lead score\n  let leadScore = 0;\n  if (data.Rating >= 4.5) leadScore += 30;\n  if (data.Rating >= 4.0) leadScore += 20;\n  if (data.Reviews >= 1000) leadScore += 25;\n  if (data.Reviews >= 100) leadScore += 15;\n  if (data.Phone) leadScore += 20;\n  if (data.Website && data.Website !== \'not found\') leadScore += 20;\n  if (keunggulan.length > 0) leadScore += 10;\n\n  return {\n    // Data utama\n    restaurant_name: data.Title,\n    category: data.Category,\n    description: data.Description || \'\',\n    location: data.Neighborhood,\n    full_address: data.Address,\n    phone: data.Phone,\n    website: data.Website !== \'not found\' ? data.Website : \'\',\n    rating: data.Rating,\n    total_reviews: data.Reviews,\n    price_range: data.Price || \'Tidak diketahui\',\n    \n    // Data terformat\n    keunggulan_list: keunggulan.join(\', \'),\n    fasilitas_list: fasilitas.join(\', \'),\n    pembayaran_list: pembayaran.join(\', \'),\n    kategori_lengkap: allCategories.join(\', \'),\n    jam_operasional: openingHours,\n    \n    // Untuk AI analysis\n    business_summary: businessDescription,\n    lead_score: leadScore,\n    lead_quality: leadScore >= 70 ? \'High\' : leadScore >= 40 ? \'Medium\' : \'Low\',\n    \n    // Metadata\n    scraped_date: new Date().toLocaleString(\'id-ID\'),\n    data_source: \'Google Maps via Apify\'\n  };\n});\n\nreturn cleanData;'
    }, position: [2520, 380], name: 'Clean Data' } }))
  .then(node({ type: 'n8n-nodes-base.googleSheets', version: 4.6, config: { parameters: {
      columns: {
        value: {
          Phone: '={{ $json.phone }}',
          Price: '={{ $json.price_range }}',
          Title: '={{ $json.restaurant_name }}',
          Rating: '={{ $json.rating }}',
          Address: '={{ $json.full_address }}',
          Reviews: '={{ $json.total_reviews }}',
          Website: '={{ $json.website }}',
          Category: '={{ $json.category }}',
          Fasilitas: '={{ $json.fasilitas_list }}',
          Keunggulan: '={{ $json.keunggulan_list }}',
          'Lead Score': '={{ $json.lead_score }}',
          Pembayaran: '={{ $json.pembayaran_list }}',
          row_number: '={{ $(\'Get Leads\').item.json.row_number }}',
          Description: '={{ $json.description }}',
          'Lead Quality': '={{ $json.lead_quality }}',
          Neighborhood: '={{ $json.location }}',
          'Opening Hours': '={{ $json.jam_operasional }}',
          'All Categories': '={{ $json.kategori_lengkap }}'
        },
        schema: [
          {
            id: 'Title',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'Title',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Description',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Description',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Category',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Category',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Address',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Address',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Phone',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Phone',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Rating',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Rating',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Reviews',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Reviews',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Price',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Price',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Website',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Website',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Neighborhood',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Neighborhood',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Opening Hours',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Opening Hours',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'All Categories',
            type: 'string',
            display: true,
            required: false,
            displayName: 'All Categories',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Keunggulan',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Keunggulan',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Fasilitas',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Fasilitas',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Pembayaran',
            type: 'string',
            display: true,
            required: false,
            displayName: 'Pembayaran',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Lead Score',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'Lead Score',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'Lead Quality',
            type: 'string',
            display: true,
            removed: false,
            required: false,
            displayName: 'Lead Quality',
            defaultMatch: false,
            canBeUsedToMatch: true
          },
          {
            id: 'row_number',
            type: 'string',
            display: true,
            removed: false,
            readOnly: true,
            required: false,
            displayName: 'row_number',
            defaultMatch: false,
            canBeUsedToMatch: true
          }
        ],
        mappingMode: 'defineBelow',
        matchingColumns: ['row_number'],
        attemptToConvertTypes: false,
        convertFieldsToString: false
      },
      options: {},
      operation: 'update',
      sheetName: {
        __rl: true,
        mode: 'list',
        value: 'gid=0',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1DKXYqpb0EWNYsbq2x8h5xqUWXy772toNDVrl8d-8nfA/edit#gid=0',
        cachedResultName: 'Restaurant'
      },
      documentId: {
        __rl: true,
        mode: 'url',
        value: 'https://docs.google.com/spreadsheets/d/1DKXYqpb0EWNYsbq2x8h5xqUWXy772toNDVrl8d-8nfA/edit?usp=sharing'
      },
      authentication: 'serviceAccount'
    }, credentials: {
      googleApi: { id: 'credential-id', name: 'googleApi Credential' }
    }, position: [2740, 380], name: 'Update Data' } }))
  .add(trigger({ type: 'n8n-nodes-base.googleSheetsTrigger', version: 1, config: { parameters: {
      options: {},
      pollTimes: { item: [{ mode: 'everyHour' }] },
      sheetName: {
        __rl: true,
        mode: 'list',
        value: 'gid=0',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1DKXYqpb0EWNYsbq2x8h5xqUWXy772toNDVrl8d-8nfA/edit#gid=0',
        cachedResultName: 'Restaurant'
      },
      documentId: {
        __rl: true,
        mode: 'list',
        value: '1DKXYqpb0EWNYsbq2x8h5xqUWXy772toNDVrl8d-8nfA',
        cachedResultUrl: 'https://docs.google.com/spreadsheets/d/1DKXYqpb0EWNYsbq2x8h5xqUWXy772toNDVrl8d-8nfA/edit?usp=drivesdk',
        cachedResultName: 'Database ReCharge'
      }
    }, credentials: {
      googleSheetsTriggerOAuth2Api: {
        id: 'credential-id',
        name: 'googleSheetsTriggerOAuth2Api Credential'
      }
    }, position: [3480, 1060] } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: '// Transform data yang baru ditambah dari spreadsheet\nconst newData = $input.all().map(item => {\n  const data = item.json;\n  \n  // Skip jika data kosong\n  if (!data.Title || data.Title.trim() === \'\') {\n    return null;\n  }\n  \n  // Buat business summary untuk embedding\n  const businessSummary = `\n${data.Title} adalah ${data.Category || \'restoran\'} yang berlokasi di ${data.Neighborhood || \'lokasi tidak diketahui\'}. \nRating: ${data.Rating || \'belum ada rating\'}/5 dengan ${data.Reviews || 0} review. \nHarga: ${data.Price || \'Tidak diketahui\'}.\n${data.Description || \'\'}\n\nKeunggulan: ${data[\'Keunggulan Clean\'] || \'Tidak ada info keunggulan\'}\nFasilitas: ${data[\'Fasilitas Clean\'] || \'Tidak ada info fasilitas\'}  \nMetode Pembayaran: ${data[\'Pembayaran Clean\'] || \'Tidak ada info pembayaran\'}\nJam Operasional: ${data[\'Jam Operasional\'] || \'Tidak tersedia\'}\n\nKontak: ${data.Phone || \'Tidak ada nomor telepon\'}\nWebsite: ${data.Website !== \'not found\' ? data.Website : \'Tidak ada website\'}\nAlamat: ${data.Address || \'Alamat tidak lengkap\'}\n`.trim();\n\n  return {\n    // Content untuk embedding\n    business_summary: businessSummary,\n    \n    // Metadata\n    metadata: {\n      restaurant_name: data.Title,\n      category: data.Category,\n      location: data.Neighborhood,\n      phone: data.Phone,\n      rating: data.Rating,\n      total_reviews: data.Reviews,\n      lead_score: data[\'Lead Score\'] || 0,\n      lead_quality: data[\'Lead Quality\'] || \'Unknown\',\n      keunggulan: data[\'Keunggulan Clean\'] || \'\',\n      fasilitas: data[\'Fasilitas Clean\'] || \'\',\n      pembayaran: data[\'Pembayaran Clean\'] || \'\',\n      website: data.Website !== \'not found\' ? data.Website : \'\',\n      price_range: data.Price || \'Tidak diketahui\',\n      full_address: data.Address,\n      jam_operasional: data[\'Jam Operasional\'] || \'Tidak tersedia\',\n      row_number: data.row_number,\n      last_updated: new Date().toISOString(),\n      data_type: "restaurant_lead",\n      source: "google_sheets_auto"\n    }\n  };\n}).filter(item => item !== null);\n\nreturn newData;'
    }, position: [3660, 1060], name: 'Transform for Vector' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: '// Check dan handle existing data di Supabase vector database\nconst inputData = $input.all();\nconst processedData = [];\n\nfor (const item of inputData) {\n  const data = item.json;\n  \n  // Skip jika data kosong atau tidak valid\n  if (!data.Title || data.Title.trim() === \'\') {\n    console.log(`Skipping empty data for row ${data.row_number}`);\n    continue;\n  }\n  \n  // Buat unique identifier berdasarkan kombinasi nama + alamat\n  const uniqueId = `${data.Title}_${data.Address}`.replace(/[^a-zA-Z0-9]/g, \'_\').toLowerCase();\n  \n  // Buat business summary untuk embedding\n  const businessSummary = `\nNama Restoran: ${data.Title}\nKategori: ${data.Category || \'Restoran\'}\nLokasi: ${data.Neighborhood || \'Tidak diketahui\'}\nAlamat: ${data.Address || \'Alamat tidak lengkap\'}\nRating: ${data.Rating || \'Belum ada rating\'}/5 (${data.Reviews || 0} reviews)\nHarga: ${data.Price || \'Tidak diketahui\'}\nDeskripsi: ${data.Description || \'Tidak ada deskripsi\'}\n\nDetail Bisnis:\n- Keunggulan: ${data.Keunggulan || \'Tidak ada info keunggulan\'}\n- Fasilitas: ${data.Fasilitas || \'Tidak ada info fasilitas\'}\n- Metode Pembayaran: ${data.Pembayaran || \'Tidak ada info pembayaran\'}\n- Jam Operasional: ${data[\'Opening Hours\'] || \'Tidak tersedia\'}\n\nKontak:\n- Telepon: ${data.Phone || \'Tidak ada nomor telepon\'}\n- Website: ${data.Website && data.Website !== \'not found\' ? data.Website : \'Tidak ada website\'}\n\nLead Score: ${data[\'Lead Score\'] || 0}\nLead Quality: ${data[\'Lead Quality\'] || \'Unknown\'}\n`.trim();\n\n  // Prepare data untuk vector store\n  const vectorData = {\n    // Text content untuk embedding\n    pageContent: businessSummary,\n    \n    // Metadata untuk filtering dan searching\n    metadata: {\n      unique_id: uniqueId,\n      restaurant_name: data.Title,\n      category: data.Category || \'Restoran\',\n      location: data.Neighborhood || \'Tidak diketahui\',\n      full_address: data.Address || \'\',\n      phone: data.Phone || \'\',\n      website: data.Website && data.Website !== \'not found\' ? data.Website : \'\',\n      rating: parseFloat(data.Rating) || 0,\n      total_reviews: parseInt(data.Reviews) || 0,\n      price_range: data.Price || \'Tidak diketahui\',\n      lead_score: parseInt(data[\'Lead Score\']) || 0,\n      lead_quality: data[\'Lead Quality\'] || \'Unknown\',\n      \n      // Additional business info\n      keunggulan: data.Keunggulan || \'\',\n      fasilitas: data.Fasilitas || \'\',\n      pembayaran: data.Pembayaran || \'\',\n      jam_operasional: data[\'Opening Hours\'] || \'\',\n      \n      // System metadata\n      row_number: data.row_number,\n      data_source: \'google_sheets\',\n      data_type: \'restaurant_lead\',\n      last_updated: new Date().toISOString(),\n      \n      // Status tracking\n      contact_status: \'not_contacted\',\n      is_active: true\n    },\n    \n    // Original row data untuk reference\n    original_data: data\n  };\n  \n  // Add flag untuk indicate ini adalah update atau insert baru\n  vectorData.metadata.is_update = !!data.row_number;\n  \n  processedData.push(vectorData);\n  \n  console.log(`Processed: ${data.Title} (ID: ${uniqueId})`);\n}\n\nconsole.log(`Total processed: ${processedData.length} items`);\n\nreturn processedData;'
    }, position: [3880, 1060], name: 'Check Existing Data' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.vectorStoreSupabase', version: 1.3, config: { parameters: {
      mode: 'insert',
      options: {},
      tableName: {
        __rl: true,
        mode: 'list',
        value: 'restaurant_leads',
        cachedResultName: 'restaurant_leads'
      }
    }, credentials: {
      supabaseApi: { id: 'credential-id', name: 'supabaseApi Credential' }
    }, subnodes: { embedding: embedding({ type: '@n8n/n8n-nodes-langchain.embeddingsOpenAi', version: 1.2, config: { parameters: { options: {} }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'small3' } }), documentLoader: documentLoader({ type: '@n8n/n8n-nodes-langchain.documentDefaultDataLoader', version: 1, config: { parameters: { options: {} }, subnodes: { textSplitter: textSplitter({ type: '@n8n/n8n-nodes-langchain.textSplitterRecursiveCharacterTextSplitter', version: 1, config: { parameters: { options: {}, chunkOverlap: 200 }, name: 'Recursive Character Text Splitter1' } }) }, name: 'Default Data Loader2' } }) }, position: [4080, 1060], name: 'Supabase Vector Store2' } }))
  .add(trigger({ type: '@devlikeapro/n8n-nodes-waha.wahaTrigger', version: 202502, config: { position: [1700, 340], name: 'WAHA Trigger' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 2, config: { parameters: {
      text: '={{ $json.payload._data.key.id }}',
      options: {
        systemMessage: '=You are a business intelligence assistant for ReCharge with access to:\n\n1. **company knowledge based** - General business documents and guides\n2. **Restaurant Leads Database** - Potential restaurant clients with ratings, contact info, and business details\n\nYou can help with:\n- Finding high-potential restaurant leads by location, rating, or category\n- Analyzing restaurant market opportunities  \n- Providing restaurant recommendations and insights\n- Preparing cold outreach strategies with personalized data\n- Business intelligence from collected restaurant data\n\nAlways use both knowledge sources to provide comprehensive answers.'
      },
      promptType: 'define'
    }, subnodes: { tools: [tool({ type: '@n8n/n8n-nodes-langchain.vectorStoreSupabase', version: 1.1, config: { parameters: {
          mode: 'retrieve-as-tool',
          topK: 20,
          options: {},
          toolName: 'CompanyDocuments',
          tableName: {
            __rl: true,
            mode: 'list',
            value: 'documents',
            cachedResultName: 'documents'
          },
          toolDescription: 'Search CompanyDocument knowledge base and business documents'
        }, credentials: {
          supabaseApi: { id: 'credential-id', name: 'supabaseApi Credential' }
        }, subnodes: { embedding: embedding({ type: '@n8n/n8n-nodes-langchain.embeddingsOpenAi', version: 1.2, config: { parameters: { options: {} }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'Embeddings OpenAI1' } }) }, name: 'RAG' } }), tool({ type: '@n8n/n8n-nodes-langchain.vectorStoreSupabase', version: 1.1, config: { parameters: {
          mode: 'retrieve-as-tool',
          topK: 20,
          options: {},
          toolName: 'RestaurantLeads',
          tableName: {
            __rl: true,
            mode: 'list',
            value: 'restaurant_leads',
            cachedResultName: 'restaurant_leads'
          },
          toolDescription: '=Search restaurant leads and potential clients data'
        }, credentials: {
          supabaseApi: { id: 'credential-id', name: 'supabaseApi Credential' }
        }, subnodes: { embedding: embedding({ type: '@n8n/n8n-nodes-langchain.embeddingsOpenAi', version: 1.2, config: { parameters: { options: {} }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'Embeddings OpenAI2' } }) }, name: 'Leads' } })], model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.2, config: { parameters: {
          model: { __rl: true, mode: 'list', value: 'gpt-4o-mini' },
          options: {}
        }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'OpenAI Chat Model' } }), memory: memory({ type: '@n8n/n8n-nodes-langchain.memoryPostgresChat', version: 1.3, config: { parameters: {
          sessionKey: '={{ $(\'WAHA Trigger\').item.json.payload._data.key.remoteJid }}',
          sessionIdType: 'customKey',
          contextWindowLength: 20
        }, credentials: {
          postgres: { id: 'credential-id', name: 'postgres Credential' }
        }, name: 'Postgres Chat Memory' } }) }, position: [2380, 740], name: 'AI Agent' } }))
  .add(trigger({ type: '@n8n/n8n-nodes-langchain.chatTrigger', version: 1.1, config: { parameters: { options: {} }, position: [2200, 1340], name: 'When chat message received' } }))
  .then(node({ type: '@n8n/n8n-nodes-langchain.agent', version: 2, config: { parameters: {
      options: {
        systemMessage: '=# Company Business Intelligence Assistant\n\nYou are "MinCharge", a specialized business intelligence assistant for the company. Your primary responsibility is to provide answers exclusively based on the available knowledge sources.\n\n## Knowledge Sources\nYou have access to two critical knowledge bases:\n1. **CompanyDocuments** - Contains business documents, service guides, company information, and operational procedures\n2. **RestaurantLeads** - Contains potential restaurant client data including ratings, contact information, business details, and market insights\n\n## 🚨 CRITICAL: Tool Selection Protocol\n\n### MANDATORY Tool Usage Rules:\n**CompanyDocuments tool MUST be used for:**\n- ANY question about company services, capabilities, or offerings\n- Pricing inquiries ("how much", "cost", "price", "fee")\n- Company information ("about the company", "what is the company", "company details")\n- Business processes ("how does the company work", "process", "procedure")\n- Service features and benefits\n- Any question containing keywords: company, service, price, cost, business, how to, process, capability, offering\n\n**RestaurantLeads tool MUST be used for:**\n- Lead generation and prospecting requests\n- Restaurant recommendations and listings\n- Market analysis and competitive intelligence\n- Location-based restaurant queries\n- Rating, review, and business characteristic analysis\n- Contact information and outreach data\n\n### Search Strategy Hierarchy:\n1. **Company-specific queries** → Use CompanyDocuments FIRST, always\n2. **Restaurant/lead queries** → Use RestaurantLeads FIRST\n3. **Business intelligence/strategy** → Use BOTH tools sequentially\n4. **Ambiguous queries** → Default to CompanyDocuments first, then RestaurantLeads if needed\n\n## Execution Process (Follow Strictly):\n1. **Query Classification**: \n   - Identify if query mentions company, services, pricing, or company info\n   - If YES → Immediately use CompanyDocuments tool\n   - If restaurant/lead focused → Use RestaurantLeads tool\n   - If business strategy → Use both tools\n\n2. **Tool Selection Verification**:\n   - Double-check that you\'re using the correct tool for the query type\n   - When in doubt about company-related content → ALWAYS search CompanyDocuments\n\n3. **Search Execution**: \n   - Execute search in identified tool(s) before generating any response\n   - Use specific, relevant keywords from user query\n\n4. **Response Generation**: \n   - Base response entirely on search results\n   - Clearly cite which knowledge base provided the information\n   - Match user\'s language (Indonesian/English)\n\n## Core Operating Principles\n- **MANDATORY SEARCH**: Never respond without searching appropriate knowledge base first\n- **NO EXTERNAL KNOWLEDGE**: Absolutely no information from outside the knowledge bases\n- **EXPLICIT SOURCE CITATION**: Always state "Based on CompanyDocuments..." or "According to RestaurantLeads..."\n- **LANGUAGE MATCHING**: Respond in exact same language as user input\n- **ACCURACY OVER COMPLETENESS**: Better to say "no information found" than guess\n\n## Quality Assurance Checklist\nBefore every response, verify:\n- ✅ Did I search the appropriate knowledge base?\n- ✅ Is my answer based solely on search results?\n- ✅ Did I cite the correct source?\n- ✅ Am I responding in the user\'s language?\n- ✅ Did I avoid using external knowledge?\n\n## Error Handling\nIf no relevant information found in knowledge bases:\n- **English**: "I searched [specific knowledge base] but don\'t have information about [topic]. Could you provide more specific details or rephrase your question?"\n- **Indonesian**: "Saya telah mencari di [basis pengetahuan spesifik] tetapi tidak memiliki informasi tentang [topik]. Bisakah Anda memberikan detail yang lebih spesifik atau mengubah pertanyaan Anda?"\n\n## Debugging Mode\nAlways mention in your response which tool you used:\n- "After searching CompanyDocuments..."\n- "Based on my search in RestaurantLeads..."\n- "From both knowledge bases..."\n\nThis helps identify if tool selection is working correctly.\n\nRemember: Your value comes from providing accurate, source-backed intelligence from the company\'s specific business context and restaurant lead database. Always search first, cite sources, and match the user\'s language.'
      }
    }, subnodes: { tools: [tool({ type: '@n8n/n8n-nodes-langchain.vectorStoreSupabase', version: 1.1, config: { parameters: {
          mode: 'retrieve-as-tool',
          topK: 20,
          options: {},
          toolName: 'CompanyDocuments',
          tableName: {
            __rl: true,
            mode: 'list',
            value: 'documents',
            cachedResultName: 'documents'
          },
          useReranker: true,
          toolDescription: '=MANDATORY TOOL for questions about: CompanyDocument services, pricing, company information, business processes, operational procedures, service capabilities, company policies, internal guidelines, and any ReCharge-specific business inquiries. Always use this tool first when users ask about ReCharge services or company information.'
        }, credentials: {
          supabaseApi: { id: 'credential-id', name: 'supabaseApi Credential' }
        }, subnodes: { embedding: embedding({ type: '@n8n/n8n-nodes-langchain.embeddingsOpenAi', version: 1.2, config: { parameters: { options: {} }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'Embeddings OpenAI3' } }) }, name: 'RAG1' } }), tool({ type: '@n8n/n8n-nodes-langchain.vectorStoreSupabase', version: 1.1, config: { parameters: {
          mode: 'retrieve-as-tool',
          topK: 20,
          options: {},
          toolName: 'RestaurantLeads',
          tableName: {
            __rl: true,
            mode: 'list',
            value: 'restaurant_leads',
            cachedResultName: 'restaurant_leads'
          },
          useReranker: true,
          toolDescription: '=Search restaurant leads database containing potential client information, ratings, contact details, business characteristics, location data, and market insights. Use for lead generation, market analysis, and client prospecting.'
        }, credentials: {
          supabaseApi: { id: 'credential-id', name: 'supabaseApi Credential' }
        }, subnodes: { embedding: embedding({ type: '@n8n/n8n-nodes-langchain.embeddingsOpenAi', version: 1.2, config: { parameters: { options: {} }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'Embeddings OpenAI4' } }) }, name: 'Leads1' } })], model: languageModel({ type: '@n8n/n8n-nodes-langchain.lmChatOpenAi', version: 1.2, config: { parameters: {
          model: { __rl: true, mode: 'list', value: 'gpt-4o-mini' },
          options: {}
        }, credentials: {
          openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
        }, name: 'Chat Model' } }), memory: memory({ type: '@n8n/n8n-nodes-langchain.memoryPostgresChat', version: 1.3, config: { parameters: { contextWindowLength: 20 }, credentials: {
          postgres: { id: 'credential-id', name: 'postgres Credential' }
        }, name: 'Chat Memory' } }) }, position: [2380, 1340], name: 'AI Agent1' } }))
  .add(node({ type: '@n8n/n8n-nodes-langchain.rerankerCohere', version: 1, config: { parameters: { modelName: 'rerank-multilingual-v3.0' }, credentials: {
      cohereApi: { id: 'credential-id', name: 'cohereApi Credential' }
    }, position: [2720, 1660] } }))
  .add(node({ type: '@n8n/n8n-nodes-langchain.rerankerCohere', version: 1, config: { parameters: { modelName: 'rerank-multilingual-v3.0' }, credentials: {
      cohereApi: { id: 'credential-id', name: 'cohereApi Credential' }
    }, position: [3020, 1660], name: 'Reranker Cohere1' } }))
  .add(sticky('# Company Knowledge Base\n', { color: 5, position: [3420, 260], width: 1100, height: 620 }))
  .add(sticky('# Scrapping and data Cleaning\n', { name: 'Sticky Note1', color: 7, position: [2020, 80], width: 1360, height: 520 }))
  .add(sticky('# Potential Leads Knowledge Base\n', { name: 'Sticky Note2', color: 5, position: [3420, 940], width: 1100, height: 600 }))
  .add(sticky('# Respond as a chatbot', { name: 'Sticky Note3', position: [2020, 640], width: 1360, height: 560 }))
  .add(sticky('# Send Message', { name: 'Sticky Note4', color: 4, position: [2020, 1240], width: 1360, height: 580 }))