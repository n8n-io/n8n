return workflow('aRW40LTNzG8bWwiu', 'TEMPLATE - R1 - News Aggregators', {
    callerPolicy: 'workflowsFromSameOwner',
    availableInMCP: false,
    executionOrder: 'v1',
    saveExecutionProgress: true,
    saveDataSuccessExecution: 'all'
  })
  .add(trigger({ type: 'n8n-nodes-base.scheduleTrigger', version: 1.2, config: { parameters: {
      rule: {
        interval: [{ daysInterval: 2, triggerAtHour: 6, triggerAtMinute: 5 }]
      }
    }, position: [-112, -448], name: 'MediaStack' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: 'b7d968fd-b4a7-4f67-9cef-d1164cd5621d',
            name: 'article_limit',
            type: 'number',
            value: 15
          },
          {
            id: '01693aa5-1d7c-4e34-8d3d-acc1b612d06d',
            name: 'categories',
            type: 'array',
            value: '=["general","business","entertainment","health","science","sports","technology"]'
          }
        ]
      }
    }, position: [112, -448], name: 'mediastack categories' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: 'const categories = $json.categories;\n\nif (!Array.isArray(categories)) {\n  throw new Error("Expected `categories` to be an array, but apparently the universe hates us.");\n}\n\nreturn categories.map(cat => ({\n  json: { category: cat }\n}));\n'
    }, position: [336, -448], name: 'Itemize Mediastack Categories' } }))
  .then(node({ type: 'n8n-nodes-base.splitInBatches', version: 3, config: { parameters: { options: {} }, position: [560, -448], name: 'Loop Over Mediastack' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'http://api.mediastack.com/v1/news',
      options: {},
      jsonQuery: '={\n  "access_key": "ACCESS_KEY",\n  "categories": "{{ $json.category }}",\n  "languages": "en",\n  "sort": "published_desc",\n  "limit": {{ $(\'mediastack categories\').item.json.article_limit }}\n}',
      sendQuery: true,
      specifyQuery: 'json'
    }, position: [784, -512], name: 'call mediastack' } }))
  .then(node({ type: 'n8n-nodes-base.splitOut', version: 1, config: { parameters: {
      include: 'allOtherFields',
      options: {},
      fieldToSplitOut: 'data'
    }, position: [1008, -512], name: 'Split Out 2' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: 'f501615f-916d-4bab-bab2-514c64fbacfa',
            name: 'title',
            type: 'string',
            value: '={{ $json.data.title }}'
          },
          {
            id: 'ba68f2c6-4d1a-4616-aa31-c155909e21fc',
            name: 'aggregator',
            type: 'string',
            value: 'mediastack'
          },
          {
            id: 'c0d0a9bd-9181-4450-98c4-65e46e66ac0f',
            name: 'category',
            type: 'string',
            value: '={{ $json.data.category }}'
          },
          {
            id: '29925006-9f72-4105-b7ca-9535bb1c19f4',
            name: 'publisher',
            type: 'string',
            value: '={{ $json.data.source }}'
          },
          {
            id: 'dd23b241-80be-47a7-bfc7-194005f02b6c',
            name: 'summary',
            type: 'string',
            value: '={{ $json.data.description }}'
          },
          {
            id: '00b5db08-1e76-410f-a0f0-f7529134501b',
            name: 'author',
            type: 'string',
            value: '={{ $json.data.author }}'
          },
          {
            id: 'ce7058c3-34c6-4e06-9ec6-e3672cf74caa',
            name: 'sources',
            type: 'string',
            value: '={{ $json.data.url }}'
          },
          {
            id: 'e0c04197-ce62-485b-89ff-18175acc8703',
            name: 'content',
            type: 'string',
            value: '={{ $json.data.description }}'
          },
          {
            id: '83cf7970-c59e-455c-b11f-385ac56c944b',
            name: 'images',
            type: 'string',
            value: '={{ $json.data.image }}'
          },
          {
            id: 'bfca41f2-1e48-4dd3-b54a-ae93a45b3a8d',
            name: 'publish_date',
            type: 'string',
            value: '={{ $json.data.published_at }}'
          }
        ]
      }
    }, position: [1232, -512], name: 'Set Mediastack' } }))
  .then(node({ type: 'n8n-nodes-base.nocoDb', version: 3, config: { parameters: {
      fieldsUi: {
        fieldValues: [
          {
            fieldName: 'source_category',
            fieldValue: '={{ $(\'Set Mediastack\').item.json.category }}'
          },
          {
            fieldName: 'title',
            fieldValue: '={{ $(\'Set Mediastack\').item.json.title }}'
          },
          { fieldName: 'status', fieldValue: 'new' },
          {
            fieldName: 'aggregator',
            fieldValue: '={{ $(\'Set Mediastack\').item.json.aggregator }}'
          },
          {
            fieldName: 'publisher',
            fieldValue: '={{ $(\'Set Mediastack\').item.json.publisher }}'
          },
          {
            fieldName: 'summary',
            fieldValue: '={{ $(\'Set Mediastack\').item.json.summary }}'
          },
          {
            fieldName: 'author',
            fieldValue: '={{ $(\'Set Mediastack\').item.json.author }}'
          },
          {
            fieldName: 'sources',
            fieldValue: '=["{{ $(\'Set Mediastack\').item.json.sources }}"]'
          },
          {
            fieldName: 'content',
            fieldValue: '={{ $(\'Set Mediastack\').item.json.content }}'
          },
          {
            fieldName: 'images',
            fieldValue: '={{ $(\'Set Mediastack\').item.json.images }}'
          },
          {
            fieldName: 'publisher_date',
            fieldValue: '={{ $(\'Set Mediastack\').item.json.publish_date }}'
          }
        ]
      },
      operation: 'create',
      authentication: 'nocoDbApiToken'
    }, credentials: {
      nocoDbApiToken: { id: 'credential-id', name: 'nocoDbApiToken Credential' }
    }, position: [1456, -512], name: 'Add Mediastack item' } }))
  .then(node({ type: 'n8n-nodes-base.wait', version: 1.1, config: { position: [1680, -448] } }))
  .add(trigger({ type: 'n8n-nodes-base.scheduleTrigger', version: 1.2, config: { parameters: {
      rule: { interval: [{ triggerAtHour: 6, triggerAtMinute: 10 }] }
    }, position: [-112, -752], name: 'CurrentsAPI' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: 'b7d968fd-b4a7-4f67-9cef-d1164cd5621d',
            name: 'article_limit',
            type: 'number',
            value: 15
          },
          {
            id: '01693aa5-1d7c-4e34-8d3d-acc1b612d06d',
            name: 'category',
            type: 'string',
            value: 'latest-news'
          }
        ]
      }
    }, position: [112, -752], name: 'currentsapi config' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://api.currentsapi.services/v1/latest-news',
      options: {},
      sendQuery: true,
      queryParameters: {
        parameters: [
          { name: 'apiKey', value: 'API_KEY' },
          { name: 'language', value: 'en' },
          { name: 'limit', value: '={{ $json.article_limit }}' }
        ]
      }
    }, position: [336, -752], name: 'call currentsapi' } }))
  .then(node({ type: 'n8n-nodes-base.splitOut', version: 1, config: { parameters: { options: {}, fieldToSplitOut: 'news' }, position: [560, -752], name: 'Split Out 3' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: 'ba68f2c6-4d1a-4616-aa31-c155909e21fc',
            name: 'aggregator',
            type: 'string',
            value: 'currentsapi'
          },
          {
            id: 'f31fc4d3-d9a1-45c4-b237-5489ed664af7',
            name: 'category',
            type: 'string',
            value: 'latest-news'
          },
          {
            id: 'f501615f-916d-4bab-bab2-514c64fbacfa',
            name: 'title',
            type: 'string',
            value: '={{ $json.title }}'
          },
          {
            id: 'c0d0a9bd-9181-4450-98c4-65e46e66ac0f',
            name: 'category',
            type: 'string',
            value: '={{ $json.category[0] }} {{ $json.category[1] }}'
          },
          {
            id: '29925006-9f72-4105-b7ca-9535bb1c19f4',
            name: 'publisher',
            type: 'string',
            value: '={{ $json.author }}'
          },
          {
            id: 'dd23b241-80be-47a7-bfc7-194005f02b6c',
            name: 'summary',
            type: 'string',
            value: '={{ $json.description }}'
          },
          {
            id: '00b5db08-1e76-410f-a0f0-f7529134501b',
            name: 'author',
            type: 'string',
            value: '={{ $json.author }}'
          },
          {
            id: 'ce7058c3-34c6-4e06-9ec6-e3672cf74caa',
            name: 'sources',
            type: 'string',
            value: '={{ $json.url }}'
          },
          {
            id: 'e0c04197-ce62-485b-89ff-18175acc8703',
            name: 'content',
            type: 'string',
            value: '={{ $json.description }}'
          },
          {
            id: '83cf7970-c59e-455c-b11f-385ac56c944b',
            name: 'images',
            type: 'string',
            value: '={{ $json.image }}'
          },
          {
            id: 'bfca41f2-1e48-4dd3-b54a-ae93a45b3a8d',
            name: 'publish_date',
            type: 'string',
            value: '={{ $json.published }}'
          }
        ]
      }
    }, position: [784, -752], name: 'Set CurrentsAPI' } }))
  .then(node({ type: 'n8n-nodes-base.nocoDb', version: 3, config: { parameters: {
      fieldsUi: {
        fieldValues: [
          {
            fieldName: 'source_category',
            fieldValue: '={{ $(\'currentsapi config\').item.json.category }}'
          },
          {
            fieldName: 'title',
            fieldValue: '={{ $(\'Set CurrentsAPI\').item.json.title }}'
          },
          { fieldName: 'status', fieldValue: 'new' },
          {
            fieldName: 'aggregator',
            fieldValue: '={{ $(\'Set CurrentsAPI\').item.json.aggregator }}'
          },
          {
            fieldName: 'publisher',
            fieldValue: '={{ $(\'Set CurrentsAPI\').item.json.publisher }}'
          },
          {
            fieldName: 'summary',
            fieldValue: '={{ $(\'Set CurrentsAPI\').item.json.summary }}'
          },
          {
            fieldName: 'author',
            fieldValue: '={{ $(\'Set CurrentsAPI\').item.json.author }}'
          },
          {
            fieldName: 'sources',
            fieldValue: '=["{{ $(\'Set CurrentsAPI\').item.json.sources }}"]'
          },
          {
            fieldName: 'content',
            fieldValue: '={{ $(\'Set CurrentsAPI\').item.json.content }}'
          },
          {
            fieldName: 'images',
            fieldValue: '={{ $(\'Set CurrentsAPI\').item.json.images }}'
          },
          {
            fieldName: 'publisher_date',
            fieldValue: '={{ $(\'Set CurrentsAPI\').item.json.publish_date }}'
          }
        ]
      },
      operation: 'create',
      authentication: 'nocoDbApiToken'
    }, credentials: {
      nocoDbApiToken: { id: 'credential-id', name: 'nocoDbApiToken Credential' }
    }, position: [1008, -752], name: 'Add CurrentsAPI item' } }))
  .add(trigger({ type: 'n8n-nodes-base.scheduleTrigger', version: 1.2, config: { parameters: { rule: { interval: [{ triggerAtHour: 6 }] } }, position: [-112, -96], name: 'NewsAPI - Top Headlines' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://newsapi.org/v2/top-headlines?country=us&apiKey=YOUR_TOKEN_HERE',
      options: {}
    }, position: [112, -96], name: 'call newsapi.org - Top Headlines' } }))
  .then(node({ type: 'n8n-nodes-base.splitOut', version: 1, config: { parameters: { options: {}, fieldToSplitOut: 'articles' }, position: [336, -96], name: 'Split Out 1' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: 'ba68f2c6-4d1a-4616-aa31-c155909e21fc',
            name: 'aggregator',
            type: 'string',
            value: 'newsapi.org'
          },
          {
            id: '98cd26a3-3aad-4c50-9737-1e34393d4102',
            name: 'category',
            type: 'string',
            value: 'top headlines'
          },
          {
            id: 'f501615f-916d-4bab-bab2-514c64fbacfa',
            name: 'title',
            type: 'string',
            value: '={{ $json.title }}'
          },
          {
            id: '29925006-9f72-4105-b7ca-9535bb1c19f4',
            name: 'publisher',
            type: 'string',
            value: '={{ $json.source.name }}'
          },
          {
            id: 'dd23b241-80be-47a7-bfc7-194005f02b6c',
            name: 'summary',
            type: 'string',
            value: '={{ $json.description }}'
          },
          {
            id: '00b5db08-1e76-410f-a0f0-f7529134501b',
            name: 'author',
            type: 'string',
            value: '={{ $json.author }}'
          },
          {
            id: 'ce7058c3-34c6-4e06-9ec6-e3672cf74caa',
            name: 'sources',
            type: 'string',
            value: '={{ $json.url }}'
          },
          {
            id: 'e0c04197-ce62-485b-89ff-18175acc8703',
            name: 'content',
            type: 'string',
            value: '={{ $json.content }}'
          },
          {
            id: '83cf7970-c59e-455c-b11f-385ac56c944b',
            name: 'images',
            type: 'string',
            value: '={{ $json.urlToImage }}'
          },
          {
            id: 'bfca41f2-1e48-4dd3-b54a-ae93a45b3a8d',
            name: 'publish_date',
            type: 'string',
            value: '={{ $json.publishedAt }}'
          }
        ]
      }
    }, position: [560, -96], name: 'Set Newsapi.org top headlines' } }))
  .then(node({ type: 'n8n-nodes-base.nocoDb', version: 3, config: { parameters: {
      fieldsUi: {
        fieldValues: [
          {
            fieldName: 'source_category',
            fieldValue: '={{ $json.category }}'
          },
          {
            fieldName: 'title',
            fieldValue: '={{ $(\'Set Newsapi.org top headlines\').item.json.title }}'
          },
          { fieldName: 'status', fieldValue: 'new' },
          {
            fieldName: 'aggregator',
            fieldValue: '={{ $(\'Set Newsapi.org top headlines\').item.json.aggregator }}'
          },
          {
            fieldName: 'publisher',
            fieldValue: '={{ $(\'Set Newsapi.org top headlines\').item.json.publisher }}'
          },
          {
            fieldName: 'summary',
            fieldValue: '={{ $(\'Set Newsapi.org top headlines\').item.json.summary }}'
          },
          {
            fieldName: 'author',
            fieldValue: '={{ $(\'Set Newsapi.org top headlines\').item.json.author }}'
          },
          {
            fieldName: 'sources',
            fieldValue: '=["{{ $(\'Set Newsapi.org top headlines\').item.json.sources }}"]'
          },
          {
            fieldName: 'content',
            fieldValue: '={{ $(\'Set Newsapi.org top headlines\').item.json.content }}'
          },
          {
            fieldName: 'images',
            fieldValue: '={{ $(\'Set Newsapi.org top headlines\').item.json.images }}'
          },
          {
            fieldName: 'publisher_date',
            fieldValue: '={{ $(\'Set Newsapi.org top headlines\').item.json.publish_date }}'
          }
        ]
      },
      operation: 'create',
      authentication: 'nocoDbApiToken'
    }, credentials: {
      nocoDbApiToken: { id: 'credential-id', name: 'nocoDbApiToken Credential' }
    }, position: [784, -96], name: 'Add NewsAPI item' } }))
  .add(trigger({ type: 'n8n-nodes-base.scheduleTrigger', version: 1.2, config: { parameters: {
      rule: { interval: [{ triggerAtHour: 6, triggerAtMinute: 1 }] }
    }, position: [-112, 272], name: 'NewsAPI - Categories' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: 'b7d968fd-b4a7-4f67-9cef-d1164cd5621d',
            name: 'article_limit',
            type: 'number',
            value: 20
          },
          {
            id: '01693aa5-1d7c-4e34-8d3d-acc1b612d06d',
            name: 'categories',
            type: 'array',
            value: '=["general","business","entertainment","health","science","sports","technology"]'
          }
        ]
      }
    }, position: [112, 272], name: 'newsapi.org categories' } }))
  .then(node({ type: 'n8n-nodes-base.code', version: 2, config: { parameters: {
      jsCode: 'const categories = $json.categories;\n\nif (!Array.isArray(categories)) {\n  throw new Error("Expected `categories` to be an array, but apparently the universe hates us.");\n}\n\nreturn categories.map(cat => ({\n  json: { category: cat }\n}));\n'
    }, position: [336, 272], name: 'Itemize Newsapi Categories' } }))
  .then(node({ type: 'n8n-nodes-base.splitInBatches', version: 3, config: { parameters: { options: {} }, position: [560, 272], name: 'Loop Over NewsAPI' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: '=https://newsapi.org/v2/top-headlines?category={{ $json.category }}&apiKey=API_KEY',
      options: {}
    }, position: [784, 208], name: 'call newsapi.org - categories' } }))
  .then(node({ type: 'n8n-nodes-base.splitOut', version: 1, config: { parameters: { options: {}, fieldToSplitOut: 'articles' }, position: [1008, 208], name: 'Split Out ' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: 'ba68f2c6-4d1a-4616-aa31-c155909e21fc',
            name: 'aggregator',
            type: 'string',
            value: 'newsapi.org'
          },
          {
            id: '6eeebd18-6bd0-4afb-9613-94030115fbaf',
            name: 'category',
            type: 'string',
            value: '={{ $(\'Itemize Newsapi Categories\').item.json.category }}'
          },
          {
            id: 'f501615f-916d-4bab-bab2-514c64fbacfa',
            name: 'title',
            type: 'string',
            value: '={{ $json.title }}'
          },
          {
            id: '29925006-9f72-4105-b7ca-9535bb1c19f4',
            name: 'publisher',
            type: 'string',
            value: '={{ $json.source.name }}'
          },
          {
            id: 'dd23b241-80be-47a7-bfc7-194005f02b6c',
            name: 'summary',
            type: 'string',
            value: '={{ $json.description }}'
          },
          {
            id: '00b5db08-1e76-410f-a0f0-f7529134501b',
            name: 'author',
            type: 'string',
            value: '={{ $json.author }}'
          },
          {
            id: 'ce7058c3-34c6-4e06-9ec6-e3672cf74caa',
            name: 'sources',
            type: 'string',
            value: '={{ $json.url }}'
          },
          {
            id: 'e0c04197-ce62-485b-89ff-18175acc8703',
            name: 'content',
            type: 'string',
            value: '={{ $json.content }}'
          },
          {
            id: '83cf7970-c59e-455c-b11f-385ac56c944b',
            name: 'images',
            type: 'string',
            value: '={{ $json.urlToImage }}'
          },
          {
            id: 'bfca41f2-1e48-4dd3-b54a-ae93a45b3a8d',
            name: 'publish_date',
            type: 'string',
            value: '={{ $json.publishedAt }}'
          }
        ]
      }
    }, position: [1232, 208], name: 'Set Newsapi.org categories' } }))
  .then(node({ type: 'n8n-nodes-base.nocoDb', version: 3, config: { parameters: {
      fieldsUi: {
        fieldValues: [
          {
            fieldName: 'source_category',
            fieldValue: '={{ $(\'Itemize Newsapi Categories\').item.json.category }}'
          },
          {
            fieldName: 'title',
            fieldValue: '={{ $(\'Set Newsapi.org categories\').item.json.title }}'
          },
          { fieldName: 'status', fieldValue: 'new' },
          {
            fieldName: 'aggregator',
            fieldValue: '={{ $(\'Set Newsapi.org categories\').item.json.aggregator }}'
          },
          {
            fieldName: 'publisher',
            fieldValue: '={{ $(\'Set Newsapi.org categories\').item.json.publisher }}'
          },
          {
            fieldName: 'summary',
            fieldValue: '={{ $(\'Set Newsapi.org categories\').item.json.summary }}'
          },
          {
            fieldName: 'author',
            fieldValue: '={{ $(\'Set Newsapi.org categories\').item.json.author }}'
          },
          {
            fieldName: 'sources',
            fieldValue: '=["{{ $(\'Set Newsapi.org categories\').item.json.sources }}"]'
          },
          {
            fieldName: 'content',
            fieldValue: '={{ $(\'Set Newsapi.org categories\').item.json.content }}'
          },
          {
            fieldName: 'images',
            fieldValue: '={{ $(\'Set Newsapi.org categories\').item.json.images }}'
          },
          {
            fieldName: 'publisher_date',
            fieldValue: '={{ $(\'Set Newsapi.org categories\').item.json.publish_date }}'
          }
        ]
      },
      operation: 'create',
      projectId: '=',
      authentication: 'nocoDbApiToken'
    }, credentials: {
      nocoDbApiToken: { id: 'credential-id', name: 'nocoDbApiToken Credential' }
    }, position: [1456, 208], name: 'Add NewsAPI item1' } }))
  .then(node({ type: 'n8n-nodes-base.wait', version: 1.1, config: { position: [1680, 272], name: 'Wait1' } }))
  .add(sticky('## [Mediastack](https://www.mediastack.com)\n Free plan - 100 calls per month\n### Categories\n- General\n- Business\n- Entertainment\n- Health\n- Science\n- Sports\n- Technology', { name: 'Sticky Note7', color: 4, position: [-320, -560], width: 2192, height: 320 }))
  .add(sticky('## Newsapi.org - Top Headlines\nFree plan - 100 requests per day\n[NewsAPI.org](https://newsapi.org/) api returns the ~20 top-headlines which are then categorized according to the Minds at Large requirements then adds the article to the [Sourced Topics](https://nocodb.srv917415.hstgr.cloud/dashboard/#/nc/p3tyenu99h3dnpk/mgoml527hlymj6l/vw0hbyzr94ttjeui/sourced_topics) table.', { name: 'Sticky Note8', color: 3, position: [-320, -224], width: 2192, height: 336 }))
  .add(sticky('## [CurrentsAPI](https://currentsapi.services/en) - Latest News\nFree plan - 20 requests per day', { name: 'Sticky Note10', color: 6, position: [-320, -864], width: 2192, height: 288 }))
  .add(sticky('## Newsapi.org - Categories\nFree plan - 100 requests per day\n[NewsAPI.org](https://newsapi.org/) api returns the articles based on the array of categories set in the `newsapi.org categories` node.\n### Categories\n- business\n- entertainment\n- general\n- health\n- science\n- sports\n- technology', { name: 'Sticky Note12', color: 3, position: [-320, 128], width: 2192, height: 352 }))
  .add(sticky('# News Aggregators\nThis workflow pulls news articles from **NewsAPI**, **Mediastack**, and **CurrentsAPI** on a scheduled basis.  \nEach provider’s results are normalized into a consistent schema, then written into your database (NocoDB by default).  \nUse case: automated aggregation of categorized news for content pipelines, research agents, or editorial queues.\n\n## What You Must Update Before Running\n#### 1. API Keys\nReplace all placeholder keys:\n- `call newsapi.org - Top Headlines` → update `API_KEY` in URL  \n- `call newsapi.org - categories` → update `API_KEY`  \n- `call mediastack` → update `"ACCESS_KEY"` in JSON  \n- `call currentsapi` → update `"API_KEY"` param\n\n### 2. Database Connection (Required)\nWorkflow uses **NocoDB** to store results.\n\nYou must:\n- Update the **NocoDB API Token** credential to your own  \n- Ensure your table includes the fields used in the `create` operations  \n  (source_category, title, summary, author, sources, content, images, publisher_date, etc.)\n\nIf you prefer **Google Sheets**, **Airtable**, or another DB:\n- Replace each NocoDB node with your equivalent “create row” operation  \n- The Set nodes already provide all normalized fields you need\n\n### 3. Scheduling\nAll schedulers are **disabled by default**.  \nEnable the following so the workflow runs automatically:\n- **NewsAPI – Top Headlines**\n- **NewsAPI – Categories**\n- **Mediastack**\n- **CurrentsAPI**\n\nYou may change the run times, but all four must be scheduled for the workflow to function as designed.\n\n## What You Can Configure\n### 1. Categories\nDefined in:\n- `newsapi.org categories`\n- `mediastack categories`\n\nEdit these arrays to pull only the categories you care about or to match your API plan limits.\n\n### 2. Article Limits\nAdjust `article_limit` in:\n- `newsapi.org categories`\n- `mediastack categories`\n- `currentsapi config`', { name: 'Sticky Note', color: 7, position: [-800, -864], width: 464, height: 1344 }))