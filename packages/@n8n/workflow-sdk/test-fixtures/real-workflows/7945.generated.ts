return workflow('FnlDCNDV3x4pYVyC', 'Hybrid Search with Qdrant & n8n, Legal AI: Indexing', { executionOrder: 'v1' })
  .add(trigger({ type: 'n8n-nodes-base.manualTrigger', version: 1, config: { position: [-368, 768], name: 'Index Dataset from HuggingFace' } }))
  .add(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://datasets-server.huggingface.co/splits',
      options: {},
      sendQuery: true,
      queryParameters: {
        parameters: [{ name: 'dataset', value: '={{ $json.dataset }}' }]
      }
    }, position: [64, 944], name: 'Get Dataset Splits' } }))
  .then(node({ type: 'n8n-nodes-base.splitOut', version: 1, config: { parameters: { options: {}, fieldToSplitOut: 'splits' }, position: [256, 944], name: 'Split Them All Out' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: '=https://datasets-server.huggingface.co/rows',
      options: {
        pagination: {
          pagination: {
            parameters: {
              parameters: [{ name: 'offset', value: '={{ $pageCount * 100 }}' }]
            },
            requestInterval: 1000,
            completeExpression: '={{ $pageCount * 100 > $response.body.num_rows_total}}\n',
            paginationCompleteWhen: 'other'
          }
        }
      },
      sendQuery: true,
      queryParameters: {
        parameters: [
          { name: 'dataset', value: '={{ $json.dataset }}' },
          { name: 'config', value: '={{ $json.config }}' },
          { name: 'split', value: '={{ $json.split }}' },
          { name: 'length', value: '=100' }
        ]
      }
    }, position: [448, 944], name: 'Get Dataset Rows (Pagination)' } }))
  .then(node({ type: 'n8n-nodes-base.splitOut', version: 1, config: { parameters: { options: {}, fieldToSplitOut: 'rows' }, position: [640, 944], name: 'Divide Per Row' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '961c95d9-c803-404b-b4b6-cb66a8a33928',
            name: 'id_qa',
            type: 'string',
            value: '={{ $json.row.id }}'
          },
          {
            id: '00f4a104-8515-49fe-a094-89d22a2ead05',
            name: 'text',
            type: 'string',
            value: '={{ $json.row.text }}'
          }
        ]
      }
    }, position: [816, 944], name: 'Restructure for Deduplicating' } }))
  .then(node({ type: 'n8n-nodes-base.summarize', version: 1.1, config: { parameters: {
      options: {},
      fieldsToSplitBy: 'text',
      fieldsToSummarize: { values: [{ field: 'id_qa', aggregation: 'append' }] }
    }, position: [1008, 944], name: 'Deduplicate Texts' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '23528728-83f3-4f11-9d66-feddc3bf27d1',
            name: 'idx',
            type: 'number',
            value: '={{ $itemIndex }}'
          },
          {
            id: 'f663bae7-ff0c-440f-9a57-cb363322fc9c',
            name: 'text',
            type: 'string',
            value: '={{ $json.text }}'
          },
          {
            id: 'bfb956b4-d5e2-46b2-b41a-850a4e00765f',
            name: 'ids_qa',
            type: 'array',
            value: '={{ $json.appended_id_qa }}'
          }
        ]
      }
    }, position: [1200, 944], name: 'Restructure for Batching' } }))
  .add(node({ type: 'n8n-nodes-base.limit', version: 1, config: { parameters: { maxItems: 500 }, position: [1440, 1264] } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '29dc2299-fb1e-4b0a-bff1-0a3e88f7eb03',
            name: 'words_in_text',
            type: 'number',
            value: '={{ $json.text.trim().split(/\\s+/).length }}'
          }
        ]
      }
    }, position: [1648, 1264], name: 'Calculate #words in Each Text' } }))
  .then(node({ type: 'n8n-nodes-base.summarize', version: 1.1, config: { parameters: {
      options: {},
      fieldsToSummarize: { values: [{ field: 'words_in_text', aggregation: 'sum' }] }
    }, position: [1856, 1264], name: 'Sum them Up' } }))
  .then(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '0f436085-17d6-4131-8e6d-7ffee50b60be',
            name: 'avg_len',
            type: 'number',
            value: '={{ $json.sum_words_in_text / 500 }}'
          }
        ]
      }
    }, position: [2064, 1264], name: 'Get the Average Text Length' } }))
  .then(merge([node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '23528728-83f3-4f11-9d66-feddc3bf27d1',
            name: 'idx',
            type: 'number',
            value: '={{ $itemIndex }}'
          },
          {
            id: 'f663bae7-ff0c-440f-9a57-cb363322fc9c',
            name: 'text',
            type: 'string',
            value: '={{ $json.text }}'
          },
          {
            id: 'bfb956b4-d5e2-46b2-b41a-850a4e00765f',
            name: 'ids_qa',
            type: 'array',
            value: '={{ $json.appended_id_qa }}'
          }
        ]
      }
    }, position: [1200, 944], name: 'Restructure for Batching' } }), node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: {
      options: {},
      assignments: {
        assignments: [
          {
            id: '0f436085-17d6-4131-8e6d-7ffee50b60be',
            name: 'avg_len',
            type: 'number',
            value: '={{ $json.sum_words_in_text / 500 }}'
          }
        ]
      }
    }, position: [2064, 1264], name: 'Get the Average Text Length' } })], { version: 3.2, parameters: { mode: 'combine', options: {}, combineBy: 'combineAll' } }))
  .add(node({ type: 'n8n-nodes-base.splitInBatches', version: 3, config: { parameters: { options: { reset: false }, batchSize: 8 }, position: [2640, 496], name: 'Loop Over Batches' } }))
  .then(node({ type: 'n8n-nodes-base.aggregate', version: 1, config: { parameters: {
      options: {},
      aggregate: 'aggregateAllItemData',
      destinationFieldName: 'batch'
    }, position: [2976, 512], name: 'Aggregate a Batch' } }))
  .then(node({ type: 'n8n-nodes-qdrant.qdrant', version: 1, config: { parameters: {
      points: '=[\n  {{\n    $json.batch.map(i => \n      ({      \n        "id": i.idx,\n        "payload": { \n          "text": i.text, \n          "ids_qa": i.ids_qa\n        },\n        "vector": {\n          "mxbai_large": {\n            "text": i.text,\n            "model": "mixedbread-ai/mxbai-embed-large-v1"\n          },\n          "bm25": {\n            "text": i.text,\n            "model": "qdrant/bm25",\n            "options": {\n              "avg_len": i.avg_len\n            }\n          }\n        }\n      }).toJsonString()\n    )\n  }}\n]',
      resource: 'point',
      operation: 'upsertPoints',
      collectionName: {
        __rl: true,
        mode: 'list',
        value: 'legalQA_test',
        cachedResultName: 'legalQA_test'
      },
      requestOptions: {}
    }, credentials: {
      qdrantApi: { id: 'credential-id', name: 'qdrantApi Credential' }
    }, position: [3232, 512], name: 'Upsert Points' } }))
  .add(node({ type: 'n8n-nodes-base.splitInBatches', version: 3, config: { parameters: { options: { reset: false }, batchSize: 8 }, position: [2640, 1312], name: 'Loop Over Batches1' } }))
  .add(node({ type: 'n8n-nodes-base.set', version: 3.4, config: { parameters: { options: {} }, position: [2912, 1104], name: 'Edit Fields' } }))
  .add(node({ type: 'n8n-nodes-base.merge', version: 3.2, config: { parameters: {
      mode: 'combine',
      options: {},
      combineBy: 'combineByPosition'
    }, position: [3680, 1312], name: 'Merge1' } }))
  .then(node({ type: 'n8n-nodes-base.aggregate', version: 1, config: { parameters: {
      options: {},
      aggregate: 'aggregateAllItemData',
      destinationFieldName: 'batch'
    }, position: [3952, 1312], name: 'Aggregate a Batch to Upsert' } }))
  .then(node({ type: 'n8n-nodes-qdrant.qdrant', version: 1, config: { parameters: {
      points: '=[\n  {{\n    $json.batch.map(i => \n      ({      \n        "id": i.idx,\n        "payload": { \n          "text": i.text, \n          "ids_qa": i.ids_qa\n        },\n        "vector": {\n          "open_ai_small": i.embedding,\n          "bm25": {\n            "text": i.text,\n            "model": "qdrant/bm25",\n            "options": {\n              "avg_len": i.avg_len\n            }\n          }\n        }\n      }).toJsonString()\n    )\n  }}\n]',
      resource: 'point',
      operation: 'upsertPoints',
      collectionName: {
        __rl: true,
        mode: 'list',
        value: 'legalQA_openAI_test',
        cachedResultName: 'legalQA_openAI_test'
      },
      requestOptions: {}
    }, credentials: {
      qdrantApi: { id: 'credential-id', name: 'qdrantApi Credential' }
    }, position: [4192, 1312], name: 'Upsert Points1' } }))
  .add(node({ type: 'n8n-nodes-base.aggregate', version: 1, config: { parameters: {
      options: {},
      aggregate: 'aggregateAllItemData',
      destinationFieldName: 'batch'
    }, position: [3088, 1216], name: 'Aggregate a Batch to Embed' } }))
  .then(node({ type: 'n8n-nodes-base.httpRequest', version: 4.2, config: { parameters: {
      url: 'https://api.openai.com/v1/embeddings',
      method: 'POST',
      options: {},
      sendBody: true,
      authentication: 'predefinedCredentialType',
      bodyParameters: {
        parameters: [
          {
            name: 'input',
            value: '={{ $json.batch.map(item => item.text) }}'
          },
          { name: 'model', value: 'text-embedding-3-small' }
        ]
      },
      nodeCredentialType: 'openAiApi'
    }, credentials: {
      openAiApi: { id: 'credential-id', name: 'openAiApi Credential' }
    }, position: [3344, 1104], name: 'Get OpenAI embeddings' } }))
  .then(node({ type: 'n8n-nodes-base.splitOut', version: 1, config: { parameters: { options: {}, fieldToSplitOut: 'data' }, position: [3520, 1104] } }))
  .add(node({ type: 'n8n-nodes-qdrant.qdrant', version: 1, config: { parameters: {
      operation: 'collectionExists',
      collectionName: 'legalQA_test',
      requestOptions: {}
    }, credentials: {
      qdrantApi: { id: 'credential-id', name: 'qdrantApi Credential' }
    }, position: [208, 288], name: 'Check Collection Exists' } }))
  .then(ifBranch([null, node({ type: 'n8n-nodes-qdrant.qdrant', version: 1, config: { parameters: {
      vectors: '{\n  "mxbai_large": \n  {\n    "size": 1024,\n    "distance": "Cosine"\n  }\n}',
      operation: 'createCollection',
      shardNumber: {},
      sparseVectors: '{\n  "bm25": \n  {\n    "modifier": "idf"\n  }\n}',
      collectionName: 'legalQA_test',
      requestOptions: {},
      replicationFactor: {},
      writeConsistencyFactor: {}
    }, credentials: {
      qdrantApi: { id: 'credential-id', name: 'qdrantApi Credential' }
    }, position: [560, 368], name: 'Create Collection' } })], { version: 2.2, parameters: {
      options: {},
      conditions: {
        options: {
          version: 2,
          leftValue: '',
          caseSensitive: true,
          typeValidation: 'loose'
        },
        combinator: 'and',
        conditions: [
          {
            id: 'd67b3ed7-aea5-4307-86f0-76c06a9da5fa',
            operator: {
              name: 'filter.operator.equals',
              type: 'string',
              operation: 'equals'
            },
            leftValue: '={{ $json.result.exists }}',
            rightValue: 'true'
          }
        ]
      },
      looseTypeValidation: true
    }, name: 'If' }))
  .add(node({ type: 'n8n-nodes-qdrant.qdrant', version: 1, config: { parameters: {
      operation: 'collectionExists',
      collectionName: 'legalQA_openAI_test',
      requestOptions: {}
    }, credentials: {
      qdrantApi: { id: 'credential-id', name: 'qdrantApi Credential' }
    }, position: [2608, 1744], name: 'Check Collection Exists1' } }))
  .then(ifBranch([null, node({ type: 'n8n-nodes-qdrant.qdrant', version: 1, config: { parameters: {
      vectors: '{\n  "open_ai_small": \n  {\n    "size": 1536,\n    "distance": "Cosine"\n  }\n}',
      operation: 'createCollection',
      shardNumber: {},
      sparseVectors: '{\n  "bm25": \n  {\n    "modifier": "idf"\n  }\n}',
      collectionName: 'legalQA_openAI_test',
      requestOptions: {},
      replicationFactor: {},
      writeConsistencyFactor: {}
    }, credentials: {
      qdrantApi: { id: 'credential-id', name: 'qdrantApi Credential' }
    }, position: [3008, 1840], name: 'Create Collection1' } })], { version: 2.2, parameters: {
      options: {},
      conditions: {
        options: {
          version: 2,
          leftValue: '',
          caseSensitive: true,
          typeValidation: 'loose'
        },
        combinator: 'and',
        conditions: [
          {
            id: 'd67b3ed7-aea5-4307-86f0-76c06a9da5fa',
            operator: {
              name: 'filter.operator.equals',
              type: 'string',
              operation: 'equals'
            },
            leftValue: '={{ $json.result.exists }}',
            rightValue: 'true'
          }
        ]
      },
      looseTypeValidation: true
    }, name: 'If1' }))
  .add(sticky('## Index Legal Dataset to Qdrant for Hybrid Retrieval\n*This pipeline is the first part of **"Hybrid Search with Qdrant & n8n, Legal AI"**.  \nThe second part, **"Hybrid Search with Qdrant & n8n, Legal AI: Retrieval"**, covers retrieval and simple evaluation.* \n\n### Overview\nThis pipeline transforms a [Q&A legal corpus from Hugging Face (isaacus)](https://huggingface.co/datasets/isaacus/LegalQAEval) into vector representations and indexes them to Qdrant, providing the foundation for running [**Hybrid Search**](https://qdrant.tech/articles/hybrid-search/), combining:\n\n- [**Dense vectors**](https://qdrant.tech/documentation/concepts/vectors/#dense-vectors) (embeddings) for semantic similarity search;  \n- [**Sparse vectors**](https://qdrant.tech/documentation/concepts/vectors/#sparse-vectors) for keyword-based exact search.\n\n\nAfter running this pipeline, you will have a Qdrant collection with your legal dataset ready for hybrid retrieval on [BM25](https://en.wikipedia.org/wiki/Okapi_BM25) and dense embeddings: either [mxbai-embed-large-v1](https://huggingface.co/mixedbread-ai/mxbai-embed-large-v1) or [`text-embedding-3-small`](https://platform.openai.com/docs/models/text-embedding-3-small).\n\n#### Options for Embedding Inference\nThis pipeline equips you with two approaches for generating dense vectors:\n\n1. Using [**Qdrant Cloud Inference**](https://qdrant.tech/documentation/cloud/inference/), conversion to vectors handled directly in Qdrant;\n2. Using external provider, e.g. OpenAI for generating embeddings.\n\n#### Prerequisites\n- A cluster on [Qdrant Cloud](https://cloud.qdrant.io/)  \n  - Paid cluster in the US region if you want to use **Qdrant Cloud Inference**  \n  - Free Tier Cluster if using an external provider (here OpenAI)  \n- Qdrant Cluster credentials: \n  - You\'ll be guided on how to obtain both the **URL** and **API_KEY** from the Qdrant Cloud UI when setting up your cluster;  \n- An **OpenAI API key** (if you’re not using Qdrant’s Cloud Inference);  \n\n#### P.S.\n- To ask retrieval in Qdrant-related questions, join the [Qdrant Discord](https://discord.gg/ArVgNHV6).  \n- Star [Qdrant n8n community node repo](https://github.com/qdrant/n8n-nodes-qdrant) <3', { name: 'Sticky Note', position: [-1056, 192], width: 592, height: 864 }))
  .add(sticky('## Get Dataset from Hugging Face\n\nFetching a sample dataset from Hugging Face using the [Dataset Viewer API](https://huggingface.co/docs/dataset-viewer/quick_start).\n**Dataset:** [LegalQAEval from isaacus](https://huggingface.co/datasets/isaacus/LegalQAEval).\n\n1. **Retrieve dataset splits**.  \n2. **Fetch all items with pagination**  \n   - Apply [pagination in HTTP node](https://docs.n8n.io/code/cookbook/http-node/pagination/#enable-pagination) to retrieve the full dataset.  \n3. **Deduplicate text chunks**  \n   - The dataset contains duplicate `text` chunks, since multiple questions may belong to each passage.  \n   - Deduplicate before indexing into Qdrant to avoid storing duplicates.  \n   - Aggregate the corresponding **question–answer IDs** so they can be reused later during retrieval evaluation.  \n4. **Format data for batching** (embeddings inference & indexing to Qdrant)  \n', { name: 'Sticky Note1', color: 5, position: [0, 592], width: 1344, height: 528 }))
  .add(sticky('## Estimate Average Length of Text Chunks\n\nAverage length of texts in the dataset is a part of the [BM25](https://en.wikipedia.org/wiki/Okapi_BM25) formula used for keyword-based retrieval.\n\n1. **Select a subsample**  \n2. **Count words per text chunk**  \n3. **Compute average length**  \n   - Calculate the mean across all chunks in the subsample.  \n   - This value will be used as the **average document length (avg_len)** parameter in BM25.', { name: 'Sticky Note2', color: 5, position: [1424, 1024], width: 800, height: 416 }))
  .add(sticky('## Create [Qdrant Collection](https://qdrant.tech/documentation/concepts/collections/) for Hybrid Search\nThe collection used for **Hybrid Search** is configured here with two types of vectors:\n\n**1. [Dense Vectors](https://qdrant.tech/documentation/concepts/vectors/#dense-vectors)**\nIn this pipeline, we\'re using the [**mxbai-embed-large-v1**](https://huggingface.co/mixedbread-ai/mxbai-embed-large-v1) embedding model through Qdrant\'s Cloud Inference. Hence, we need to specify during the collection configuration its:\n- **Dimensions**: 1024  \n- **Similarity metric**: `cosine`\n\n\n**2. [Sparse Vectors](https://qdrant.tech/documentation/concepts/vectors/#sparse-vectors)**\nQdrant’s main mechanism for setting up **keyword-based retrieval**. \nFor example, you can set up retrieval with:\n  - [**BM25**](https://en.wikipedia.org/wiki/Okapi_BM25) (used in this pipeline);\n    - Qdrant provides an [**`IDF` modifier**](https://qdrant.tech/documentation/concepts/indexing/#idf-modifier) for sparse vectors. This enables Qdrant to calculate **inverse document frequency (IDF)** statistics on the server side. These statistics evaluate the importance of keywords, for example, in BM25.  \n  - SPLADE, miniCOIL and other sparse neural retrievers.  \n\n', { name: 'Sticky Note3', color: 5, position: [16, -128], width: 1088, height: 640 }))
  .add(sticky('## (Option №1) Index Text Chunks to Qdrant Using [Cloud Inference](https://qdrant.tech/documentation/cloud/inference/)\n\n- **Embed & upsert text chunks in batches**  \n  - **Dense embeddings inference + upsert handled by Qdrant node**, it takes care of generating embeddings and inserting them into the collection.  \n  - **Sparse representations for BM25** are created automatically under the hood by Qdrant.  \n', { name: 'Sticky Note4', color: 5, position: [2544, 288], width: 960, height: 480 }))
  .add(sticky('## (Option №2) 1. Configure a Collection for OpenAI Embeddings & BM25 Retrieval\nSince [`text-embedding-3-small`] OpenAI embeddings have a different dimensionality (1536) than mxbai embeddings (1024), you need to account for this when configuring the collection. \n \nFor simplicity, create a **separate collection** dedicated to OpenAI embeddings. This collection will be used to index texts in this block.  ', { name: 'Sticky Note5', color: 7, position: [2528, 1552], width: 688, height: 448 }))
  .add(sticky('## (Option №2) Index Text Chunks to Qdrant Using External Embedding Provider (OpenAI)\n*Don\'t forget to create and configure a separate collection for OpenAI’s [`text-embedding-3-small`](https://platform.openai.com/docs/models/text-embedding-3-small) embeddings.*\n\n1. **Embed texts in batches** with OpenAI\'s [`text-embedding-3-small`](https://platform.openai.com/docs/models/text-embedding-3-small), generating dense vectors.  \n\n2. **Upsert batches to Qdrant:**\n- Pass pre-embedded by OpenAi dense vectors to Qdrant;\n- Sparse representations for BM25 are created automatically under the hood by Qdrant.  ', { name: 'Sticky Note6', color: 5, position: [2512, 864], width: 1872, height: 1152 }))