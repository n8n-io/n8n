const wf = workflow('h81ddl7uooV3eLBq', 'Hybrid Search with Qdrant & n8n, Legal AI: Retrieval', {
	executionOrder: 'v1',
})
	.add(
		trigger({
			type: 'n8n-nodes-base.manualTrigger',
			version: 1,
			config: { position: [-256, 400], name: 'Index Dataset from HuggingFace' },
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://datasets-server.huggingface.co/splits',
					options: {},
					sendQuery: true,
					queryParameters: {
						parameters: [{ name: 'dataset', value: '={{ $json.dataset }}' }],
					},
				},
				position: [-32, 400],
				name: 'Get Dataset Splits',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitOut',
			version: 1,
			config: {
				parameters: { options: {}, fieldToSplitOut: 'splits' },
				position: [176, 400],
				name: 'Split Them All Out',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.filter',
			version: 2.2,
			config: {
				parameters: {
					options: {},
					conditions: {
						options: {
							version: 2,
							leftValue: '',
							caseSensitive: true,
							typeValidation: 'strict',
						},
						combinator: 'and',
						conditions: [
							{
								id: '52e3d8e2-825f-4e43-9d5f-e275d196b442',
								operator: {
									name: 'filter.operator.equals',
									type: 'string',
									operation: 'equals',
								},
								leftValue: '={{ $json.split }}',
								rightValue: 'test',
							},
						],
					},
				},
				position: [384, 400],
				name: 'Keep Test Split',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: '=https://datasets-server.huggingface.co/rows',
					options: {},
					sendQuery: true,
					queryParameters: {
						parameters: [
							{ name: 'dataset', value: '={{ $json.dataset }}' },
							{ name: 'config', value: '={{ $json.config }}' },
							{ name: 'split', value: '={{ $json.split }}' },
							{ name: 'length', value: '=100' },
						],
					},
				},
				position: [592, 400],
				name: 'Get Test Queries',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitOut',
			version: 1,
			config: {
				parameters: { options: {}, fieldToSplitOut: 'rows' },
				position: [816, 400],
				name: 'Divide Per Row',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.filter',
			version: 2.2,
			config: {
				parameters: {
					options: {},
					conditions: {
						options: {
							version: 2,
							leftValue: '',
							caseSensitive: true,
							typeValidation: 'strict',
						},
						combinator: 'and',
						conditions: [
							{
								id: 'd1120153-1852-42c0-8b0a-084e8c3190d3',
								operator: { type: 'number', operation: 'gt' },
								leftValue: '={{ $json.row.answers.length }}',
								rightValue: 0,
							},
						],
					},
				},
				position: [1056, 400],
				name: 'Keep Questions with Answers in the Dataset',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.set',
			version: 3.4,
			config: {
				parameters: {
					options: {},
					assignments: {
						assignments: [
							{
								id: '961c95d9-c803-404b-b4b6-cb66a8a33928',
								name: 'id_qa',
								type: 'string',
								value: '={{ $json.row.id }}',
							},
							{
								id: '0fefba06-4567-479c-9eb5-efbb3e13e743',
								name: 'question',
								type: 'string',
								value: '={{ $json.row.question }}',
							},
						],
					},
				},
				position: [1280, 400],
				name: 'Keep Questions & IDs',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitInBatches',
			version: 3,
			config: {
				parameters: { options: { reset: false } },
				position: [1776, 400],
				name: 'Loop Over Items',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.aggregate',
			version: 1,
			config: {
				parameters: {
					options: {},
					aggregate: 'aggregateAllItemData',
					destinationFieldName: 'eval',
				},
				position: [2032, 224],
				name: 'Aggregate Evals',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.set',
			version: 3.4,
			config: {
				parameters: {
					options: {},
					assignments: {
						assignments: [
							{
								id: '5bca1a50-3e41-4f50-8362-cb7b185b50f6',
								name: 'Hits percentage',
								type: 'number',
								value:
									'={{ ($json.eval.filter(item => item.isHit).length * 100) / $json.eval.length}}',
							},
						],
					},
				},
				position: [2256, 224],
				name: 'Percentage of isHits in Evals',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.merge',
			version: 3.2,
			config: {
				parameters: { mode: 'combine', options: {}, combineBy: 'combineAll' },
				position: [2320, 608],
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.set',
			version: 3.4,
			config: {
				parameters: {
					include: 'selected',
					options: {},
					assignments: {
						assignments: [
							{
								id: '80089820-cc55-4b74-966e-b50a3f4b6e36',
								name: 'isHit',
								type: 'boolean',
								value: '={{ $json.result.points[0].payload.ids_qa.includes($json.id_qa) }}',
							},
						],
					},
					includeFields: 'id_qa,question',
					includeOtherFields: true,
				},
				position: [2512, 608],
				name: 'isHit = If we Found the Correct Answer',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-qdrant.qdrant',
			version: 1,
			config: {
				parameters: {
					limit: 1,
					query: '{\n  "fusion": "rrf"\n}',
					prefetch:
						'=[\n  {\n    "query": {\n      "text": "{{ $json.question }}",\n      "model": "mixedbread-ai/mxbai-embed-large-v1"\n    },\n    "using": "mxbai_large",\n    "limit": 25\n  },\n  {\n    "query": {\n      "text": "{{ $json.question }}",\n      "model": "qdrant/bm25"\n    },\n    "using": "bm25",\n    "limit": 25\n  }\n]',
					resource: 'search',
					operation: 'queryPoints',
					collectionName: {
						__rl: true,
						mode: 'list',
						value: 'legalQA_test',
						cachedResultName: 'legalQA_test',
					},
					requestOptions: {},
				},
				credentials: {
					qdrantApi: { id: 'credential-id', name: 'qdrantApi Credential' },
				},
				position: [2144, 416],
				name: 'Query Points',
			},
		}),
	)
	.add(
		sticky(
			'## Get Questions to Eval Retrieval from Hugging Face Dataset (Already Indexed to Qdrant)\n\nFetching questions from a sample Q&A dataset on Hugging Face using the [Dataset Viewer API](https://huggingface.co/docs/dataset-viewer/quick_start).  \n**Dataset:** [LegalQAEval (isaacus)](https://huggingface.co/datasets/isaacus/LegalQAEval)\n\n1. **Retrieve dataset splits**.  \n2. **Get a small subsample of questions from the `test` split**.  \n   To fetch the full split, apply [pagination in HTTP node](https://docs.n8n.io/code/cookbook/http-node/pagination/#enable-pagination), as shown in Part 1.  \n3. **Keep only questions that have a paired text chunk answering them**, so evaluation remains fair.  \n',
			{ name: 'Sticky Note2', color: 5, position: [-96, 144], width: 1520, height: 464 },
		),
	)
	.add(
		sticky(
			'## Check Quality of Simple Hybrid Search on Legal Q&A Dataset\nFor each question in the evaluation set, using the qdrant collection created and indexed in Part 1:\n1. **Perform a Hybrid Search in Qdrant**  \n   - Get 25 results with [**BM25-based keyword retrieval**](https://en.wikipedia.org/wiki/Okapi_BM25) (exact word matches).  \n     - Sparse representations for BM25 are created automatically by Qdrant.  \n   - Get 25 results with [**mxbai-embed-large-v1**](https://huggingface.co/mixedbread-ai/mxbai-embed-large-v1) semantic search (meaning-based matches).  \n     - Here we use [**Qdrant Cloud Inference**](https://qdrant.tech/documentation/cloud/inference/), so conversion of questions to vectors and searching is handled by the Qdrant node.  \n     - To use an external provider (e.g. OpenAI), see Part 1 for an example on how to adapt this template.  \n   - Fuse both result lists with **Reciprocal Rank Fusion (RRF)**.  \n   - Select the **top-1 result**.  \n2. **Check the top-1 result**  \n   - Verify if the text chunk contains the correct answer. This is done by checking if the question ID is present in the list of related to the text chunk question IDs (created in Part 1).  \n3. **Aggregate results**  \n   - Calculate the **hits@1**: percentage of evaluation questions where the top-1 retrieved chunk contained the answer.  \n\n- If results are good → you can reuse the **Qdrant Query Points** node as a tool for an **agentic legal AI RAG** system.  \n- If results are poor → don’t worry. This is the *simplest* hybrid query setup. You can improve quality with [various tooling for hybrid search in Qdrant](https://qdrant.tech/documentation/concepts/hybrid-queries/):  \n  - Reranking  \n  - Score boosting  \n  - Tuning vector index parameters  \n  - …  \n\n\nExperiment! 🙂\n\n',
			{ name: 'Sticky Note4', color: 5, position: [1696, -256], width: 1088, height: 1120 },
		),
	)
	.add(
		sticky(
			'## Evaluate Hybrid Search on Legal Dataset\n*This is the second part of **"Hybrid Search with Qdrant & n8n, Legal AI."**\nThe first part, **"Indexing,"** covers preparing and uploading the dataset to Qdrant.*\n\n### Overview\nThis pipeline demonstrates how to perform **Hybrid Search** on a [Qdrant collection](https://qdrant.tech/documentation/concepts/collections/#collections) using `question`s and `text` chunks (containing answers) from the  \n[LegalQAEval dataset (isaacus)](https://huggingface.co/datasets/isaacus/LegalQAEval).\n\nOn a small subset of questions, it shows:  \n- How to set up hybrid retrieval in Qdrant with:  \n  - [BM25](https://en.wikipedia.org/wiki/Okapi_BM25)-based keyword retrieval;\n  - [mxbai-embed-large-v1](https://huggingface.co/mixedbread-ai/mxbai-embed-large-v1) semantic retrieval;  \n  - **Reciprocal Rank Fusion (RRF)**, a simple zero-shot fusion of the two searches;\n- How to run a basic evaluation:  \n  - Calculate **hits@1** — the percentage of evaluation questions where the top-1 retrieved text chunk contains the correct answer  \n\n\nAfter running this pipeline, you will have a quality estimate of a simple hybrid retrieval setup.  \nFrom there, you can reuse Qdrant’s **Query Points** node to build a **legal RAG chatbot**.  \n\n### Embedding Inference\n- By default, this pipeline uses [**Qdrant Cloud Inference**](https://qdrant.tech/documentation/cloud/inference/) to convert questions to embeddings.  \n- You can also use an **external embedding provider** (e.g. OpenAI).  \n  - In that case, minimally update the pipeline, similar to the adjustments showed in **Part 1: Indexing**.  \n\n### Prerequisites\n- **Completed Part 1 pipeline**, *"Hybrid Search with Qdrant & n8n, Legal AI: Indexing"*, and the collection created in it;\n- All the requirements of **Part 1 pipeline**;\n\n### Hybrid Search\nThe example here is a **basic hybrid query**. You can extend/enhance it with:\n- Reranking strategies;  \n- Different fusion techniques;\n- Score boosting based on metadata;\n- ...  \n\nMore details: [Hybrid Queries in Qdrant](https://qdrant.tech/documentation/concepts/hybrid-queries/).  \n\n#### P.S.\n- To ask retrieval in Qdrant-related questions, join the [Qdrant Discord](https://discord.gg/ArVgNHV6).  \n- Star [Qdrant n8n community node repo](https://github.com/qdrant/n8n-nodes-qdrant) <3\n',
			{ name: 'Sticky Note1', position: [-1344, -128], width: 1008, height: 960 },
		),
	);
