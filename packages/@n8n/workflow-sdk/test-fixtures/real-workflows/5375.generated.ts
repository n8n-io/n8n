const wf = workflow('qS9W7d2IVCxZZKaN', '选题捕手模板', { executionOrder: 'v1' })
	.add(
		trigger({
			type: 'n8n-nodes-base.formTrigger',
			version: 2.2,
			config: {
				parameters: {
					options: {},
					formTitle: '选题捕手',
					formFields: {
						values: [
							{
								fieldLabel: 'keyword',
								placeholder: 'e.g.AI',
								requiredField: true,
							},
						],
					},
					formDescription: 'Please enter the core keywords you want to analyze, then click Submit.',
				},
				position: [-3340, 300],
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
								id: 'keyword-assignment',
								name: 'keyword',
								type: 'string',
								value: "={{ $json.body.keyword || $json.query.keyword || 'AI' }}",
							},
							{
								id: 'date-assignment',
								name: 'search_date',
								type: 'string',
								value: "={{ $now.toFormat('yyyy-MM-dd') }}",
							},
							{
								id: 'analysis-id',
								name: 'analysis_id',
								type: 'string',
								value:
									"={{ $now.toFormat('yyyyMMddHHmmss') }}_{{ ($json.body.keyword || $json.query.keyword || 'default').replace(' ', '_') }}",
							},
						],
					},
				},
				position: [-3160, 300],
				name: 'Analysis Parameters',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://www.googleapis.com/youtube/v3/search',
					options: {},
					sendQuery: true,
					authentication: 'genericCredentialType',
					genericAuthType: 'httpQueryAuth',
					queryParameters: {
						parameters: [
							{ name: 'part', value: 'snippet' },
							{
								name: 'q',
								value: "={{ $('Analysis Parameters').item.json.keyword }}",
							},
							{ name: 'type', value: 'video' },
							{ name: 'order', value: 'relevance' },
							{ name: 'maxResults', value: '15' },
							{
								name: 'publishedAfter',
								value: '={{ $now.minus({days: 7}).toISO() }}',
							},
						],
					},
				},
				credentials: {
					httpQueryAuth: { id: 'credential-id', name: 'httpQueryAuth Credential' },
				},
				position: [-2940, 340],
				name: 'YouTube: Search Videos',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitOut',
			version: 1,
			config: { parameters: { options: {}, fieldToSplitOut: 'items' }, position: [-2760, 340] },
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
								id: 'youtube-weight',
								name: 'source_weight',
								type: 'number',
								value: 0.8,
							},
							{
								id: 'youtube-source',
								name: 'source_type',
								type: 'string',
								value: 'youtube',
							},
							{
								id: 'youtube-content',
								name: 'content',
								type: 'string',
								value: "={{ $json.snippet.title + ' ' + $json.snippet.description }}",
							},
							{
								id: 'youtube-url',
								name: 'url',
								type: 'string',
								value: '=https://www.youtube.com/watch?v={{ $json.id.videoId }}',
							},
							{
								id: 'youtube-channel',
								name: 'channel',
								type: 'string',
								value: '={{ $json.snippet.channelTitle }}',
							},
						],
					},
				},
				position: [-2580, 340],
				name: 'Format YouTube Data',
			},
		}),
	)
	.then(
		merge(
			[
				node({
					type: 'n8n-nodes-base.set',
					version: 3.4,
					config: {
						parameters: {
							options: {},
							assignments: {
								assignments: [
									{
										id: 'reddit-weight',
										name: 'source_weight',
										type: 'number',
										value: 0.7,
									},
									{
										id: 'reddit-source',
										name: 'source_type',
										type: 'string',
										value: 'reddit',
									},
									{
										id: 'reddit-content',
										name: 'content',
										type: 'string',
										value: "={{ $json.title + ' ' + ($json.selftext || '') }}",
									},
									{
										id: 'reddit-url',
										name: 'url',
										type: 'string',
										value: '={{ $json.url }}',
									},
									{
										id: 'reddit-score',
										name: 'engagement_score',
										type: 'number',
										value: '={{ $json.ups }}',
									},
								],
							},
						},
						position: [-2760, 160],
						name: 'Format Reddit Data',
					},
				}),
				node({
					type: 'n8n-nodes-base.set',
					version: 3.4,
					config: {
						parameters: {
							options: {},
							assignments: {
								assignments: [
									{
										id: 'youtube-weight',
										name: 'source_weight',
										type: 'number',
										value: 0.8,
									},
									{
										id: 'youtube-source',
										name: 'source_type',
										type: 'string',
										value: 'youtube',
									},
									{
										id: 'youtube-content',
										name: 'content',
										type: 'string',
										value: "={{ $json.snippet.title + ' ' + $json.snippet.description }}",
									},
									{
										id: 'youtube-url',
										name: 'url',
										type: 'string',
										value: '=https://www.youtube.com/watch?v={{ $json.id.videoId }}',
									},
									{
										id: 'youtube-channel',
										name: 'channel',
										type: 'string',
										value: '={{ $json.snippet.channelTitle }}',
									},
								],
							},
						},
						position: [-2580, 340],
						name: 'Format YouTube Data',
					},
				}),
				node({
					type: 'n8n-nodes-base.code',
					version: 2,
					config: {
						parameters: {
							mode: 'runOnceForEachItem',
							jsCode:
								"// 新代码：输出与其他平台完全一致的格式，并增加 engagement_score\ntry {\n  const tweetObject = $input.item.json;\n\n  // 从推文的公开指标(public_metrics)中计算一个综合的互动分数\n  // 同时增加安全检查，防止某些指标不存在时报错\n  const metrics = tweetObject.public_metrics || {};\n  const likeCount = metrics.like_count || 0;\n  const retweetCount = metrics.retweet_count || 0;\n  const replyCount = metrics.reply_count || 0;\n  const quoteCount = metrics.quote_count || 0;\n  const engagementScore = likeCount + retweetCount + replyCount + quoteCount;\n\n  // 构建与其他平台格式完全一致的result对象\n  const result = {\n    source_weight: 0.9,                        // 权重\n    source_type: 'twitter',                    // 来源类型\n    content: tweetObject.text,                 // 推文内容\n    url: `https://x.com/anyuser/status/${tweetObject.id}`, // 推文链接\n    engagement_score: engagementScore          // 互动分数\n  };\n\n  return { json: result };\n\n} catch (error) {\n  console.error('处理推文JSON时出错:', error);\n  return { json: { error: '处理推文JSON失败', raw_data: $input.item.json } };\n}",
						},
						position: [-2760, 520],
						name: 'Parse Twitter Data',
					},
				}),
			],
			{ version: 3, parameters: { numberInputs: 3 }, name: 'Merge: All Sources' },
		),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitInBatches',
			version: 3,
			config: {
				parameters: { options: {}, batchSize: 10 },
				position: [-2200, 360],
				name: 'Loop Over Items',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.chainLlm',
			version: 1.7,
			config: {
				parameters: {
					text: '你是一位敏锐的选题策划，你的任务是为编辑发掘有潜力的内容，而不是过滤信息，同时需要【保留原始内容】。\n\n请根据给定的关键词，为每一条内容进行判断。如果内容满足【以下任一条件】，就必须标记为"YES"，否则标记为"NO"：\n1. 包含强烈的个人观点、情绪或独特的个人经历。\n2. 引发了争议或多人参与的讨论。\n3. 提出了一个新颖的问题或与众不同的见解。\n4. 虽然简短，但可能是一个新兴趋势或网络“梗”的苗头。\n\n你的目标是“宁滥勿缺”，只要内容有任何可能成为好选题的火花，都应标记为YES。纯粹的广告或垃圾信息才应标记为NO。\n\n你的回复必须遵循以下规则：\n1. 返回一个严格的JSON数组格式的字符串，不要包含任何markdown标记 (如```json)。\n2. 该数组的长度必须与输入数组完全一致。\n3. 数组中的每个对象都必须包含以下三个字段：\n   - `url`: 原始内容的URL。\n   - `decision`: 你的判断结果，值为 \'YES\' 或 \'NO\'。\n   - `content`: 必须原封不动地返回原始内容。\n\n示例输出格式:\n[\n  { "url": "[http://example.com/article1](http://example.com/article1)", "decision": "YES", "content": "这是第一篇文章的内容..." },\n  { "url": "[http://example.com/article2](http://example.com/article2)", "decision": "NO", "content": "这是第二篇文章的内容..." }\n]\n\n关键词: {{ $(\'设置分析参数\').item.json.keyword }}\n\n待处理内容数组:\n{{ JSON.stringify($json.data) }}',
					batching: { batchSize: 20 },
					messages: {
						messageValues: [
							{
								message:
									"=关键词: {{ $('Analysis Parameters').item.json.keyword }}  待处理内容数组: {{ JSON.stringify($json) }}",
							},
						],
					},
					promptType: 'define',
				},
				subnodes: {
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
						version: 1,
						config: {
							parameters: { options: {}, modelName: 'models/gemini-2.0-flash' },
							credentials: {
								googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' },
							},
							name: 'Pre-filter Content',
						},
					}),
				},
				position: [-2040, 360],
				name: 'AI Pre-filtering',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: {
				parameters: {
					jsCode:
						"// 最终代码：在\"Run Once for All Items\"模式下，处理所有批次并返回所有结果\n\n// 1. 创建一个空数组，用来存放所有批次解析后的最终结果。\nconst allParsedItems = [];\n\n// 2. 遍历所有输入的项目（您这里的10个批次）。\n//    $input.all() 可以获取全部的输入项。\nfor (const batchItem of $input.all()) {\n  try {\n    const contentString = batchItem.json.text;\n    if (!contentString) continue; // 如果某个批次的text为空，则跳过\n\n    const cleanedContent = contentString.replace(/```json/g, '').replace(/```/g, '').trim();\n\n    // 3. 解析当前批次中的JSON字符串。\n    const itemsInBatch = JSON.parse(cleanedContent);\n\n    // 4. 将解析出的项目（一个数组）添加到我们最终的总结果数组中。\n    if (Array.isArray(itemsInBatch)) {\n      allParsedItems.push(...itemsInBatch);\n    }\n\n  } catch (error) {\n    // 如果某个批次解析失败，在控制台打印错误并继续处理下一个批次。\n    console.error(`一个批次解析失败。错误: ${error.message}. 批次内容: ${batchItem.json.text}`);\n  }\n}\n\n// 5. 循环结束后，将包含了所有结果的总数组，格式化成n8n需要的格式并返回。\nreturn allParsedItems.map(item => ({ json: item }));",
				},
				position: [-1740, 360],
				name: 'Parse AI Filter Results',
			},
		}),
	)
	.then(
		ifBranch(
			[
				node({
					type: 'n8n-nodes-base.aggregate',
					version: 1,
					config: {
						parameters: { options: {}, aggregate: 'aggregateAllItemData' },
						position: [-1340, 240],
						name: 'Aggregate: Relevant Items',
					},
				}),
				node({
					type: 'n8n-nodes-base.code',
					version: 2,
					config: {
						parameters: {
							jsCode:
								"try {\n  const errorInfo = {\n    error: '工作流执行出错',\n    timestamp: new Date().toISOString(),\n    node_error: $input.item(0).json.error || '未知错误',\n    analysis_id: $('Analysis Parameters').item.json.analysis_id || 'unknown'\n  };\n  \n  console.error('工作流错误:', errorInfo);\n  return { json: errorInfo };\n} catch (e) {\n  return { \n    json: { \n      error: '严重错误: 错误处理节点也失败了',\n      timestamp: new Date().toISOString()\n    } \n  };\n}",
						},
						position: [-1340, 520],
						name: 'Handle Filter Errors',
					},
				}),
			],
			{
				version: 2.2,
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
								id: 'filter-condition',
								operator: { type: 'string', operation: 'equals' },
								leftValue: '={{ $json.decision }}',
								rightValue: 'YES',
							},
						],
					},
				},
				name: 'IF: Is Content Relevant',
			},
		),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.chainLlm',
			version: 1.7,
			config: {
				parameters: {
					text: '=你是一个具备媒体素养和新闻敏感度的信息分析专家。你将收到一个 JSON 数组，每个元素包含一篇文章的内容与基础信息。请逐条进行深度结构化分析，并输出统一格式的 JSON 结果。\n\n分析目标：\n1. 提取文章的核心信息；\n2. 评估其用户情绪与传播潜力；\n3. 给出可衍生的新选题建议。\n\n请严格遵循以下输出格式，返回一个JSON字符串，不要包含任何markdown标记 (如```json)：\n\n{\n  "analyses": [\n    {\n      "original_url": "...",\n      "summary": "一句话核心摘要",\n      "topic": "文章主话题",\n      "sentiment": "positive | negative | mixed",\n      "key_arguments": ["要点A", "要点B", "要点C"],\n      "trending_potential": 1-10之间的数字（基于该内容的热点潜力）,\n      "audience_interest": 1-10之间的数字（基于普通用户的兴趣度）,\n      "news_value": 1-10之间的数字（基于该内容的信息价值）,\n      "angle_suggestions": ["可衍生选题角度1", "可衍生选题角度2"]\n    }\n  ]\n}\n\n请确保：\n- 分析维度客观中立。\n- 输出 JSON 严格符合格式要求。\n- 每条分析完整、无缺漏字段。\n- `original_url` 字段必须存在并且与输入内容一致。\n\n关键词: {{ $(\'Analysis Parameters\').item.json.keyword }}\n\n待分析内容数组:\n{{ JSON.stringify($json.data) }}',
					batching: {},
					promptType: 'define',
				},
				subnodes: {
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
						version: 1,
						config: {
							parameters: { options: {}, modelName: 'models/gemini-2.0-flash' },
							credentials: {
								googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' },
							},
							name: 'Deep Analysis',
						},
					}),
				},
				position: [-1180, 240],
				name: 'AI Deep Analysis',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.code',
			version: 2,
			config: {
				parameters: {
					jsCode:
						"// 新代码：增加了清理步骤\ntry {\n  // 1. 从 'text' 字段获取AI返回的原始字符串\n  let contentString = $input.item.json.text;\n  \n  // 2. **新增的关键步骤：清理字符串，去掉AI可能添加的markdown标记**\n  contentString = contentString.replace(/```json/g, '').replace(/```/g, '').trim();\n  \n  // 3. 解析这个干净的字符串\n  const aiResults = JSON.parse(contentString);\n  \n  // 4. 从上游的\"聚合1\"节点获取原始数据项\n  const originalItems = $('Aggregate: Relevant Items').all();\n\n  // 5. 检查AI输出是否是我们期望的格式\n  if (!aiResults.analyses || !Array.isArray(aiResults.analyses)) {\n    throw new Error(\"AI output is not in the expected format: { \\\"analyses\\\": [...] }\");\n  }\n\n  // 6. 将AI分析结果与原始数据进行匹配和合并\n  const enrichedAnalyses = aiResults.analyses.map(analysis => {\n    const originalItem = originalItems.find(item => item.json.url === analysis.original_url);\n    \n    return {\n      json: {\n        ...analysis,\n        source_info: originalItem ? {\n          type: originalItem.json.source_type,\n          weight: originalItem.json.source_weight,\n          engagement_score: originalItem.json.engagement_score || 0\n        } : {\n          type: 'unknown',\n          url: analysis.original_url\n        },\n        analysis_timestamp: new Date().toISOString()\n      }\n    };\n  });\n  \n  // 7. 返回包含所有合并后结果的数组\n  return enrichedAnalyses;\n\n} catch (error) {\n  console.error('成型分析结果节点错误:', error);\n  return [{ \n    json: { \n      error: `成型分析结果失败: ${error.message}`,\n      raw_content: $input.item.json.text || 'No raw content available'\n    } \n  }];\n}",
				},
				position: [-840, 240],
				name: 'Structure Analysis Result',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.aggregate',
			version: 1,
			config: {
				parameters: { options: {}, aggregate: 'aggregateAllItemData' },
				position: [-600, 240],
				name: 'Aggregate: Deep Analysis Results',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 2,
			config: {
				parameters: {
					text: "={{ `你是一位顶级的图书编辑和内容策略师。你现在拥有 ${$json.length} 篇关于“${$('Analysis Parameters').item.json.keyword}”的高质量文章的结构化分析数据（JSON 格式）。\n\n分析数据如下：\n${JSON.stringify($json)}\n\n请基于这些数据，完成以下任务，并直接输出一份可以直接用于发送邮件的、格式优美的**HTML代码**。请使用 <h1>, <h2>, <h3>作为各级标题，使用<ul>和<li>创建列表，使用<strong>或<b> 对关键点进行加粗。请确保你的回复只包含纯粹的HTML代码，不要有任何额外的解释或Markdown标记。\n1. **聚类分析**：识别出 3-5 个最热门或最核心的讨论焦点。\n2. **趋势预测**：基于用户情绪和讨论热度，预测哪个焦点在未来最有潜力成为爆款。\n3. **选题生成**：为每个核心焦点，生成 2 个具有爆款潜力的选题。每个选题需提供：\n   - **标题 (Catchy Title)**\n   - **核心大纲 (Outline)**\n   - **关键论点 (Key Arguments)**` }}",
					options: {},
					promptType: 'define',
					hasOutputParser: true,
				},
				subnodes: {
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatGoogleGemini',
						version: 1,
						config: {
							parameters: { options: {}, modelName: 'models/gemini-2.5-flash' },
							credentials: {
								googlePalmApi: { id: 'credential-id', name: 'googlePalmApi Credential' },
							},
							name: 'Synthesis',
						},
					}),
				},
				position: [-440, 240],
				name: 'AI: Synthesize Final Report',
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
								id: '27744290-a4c0-4afb-b948-bf19f3998b38',
								name: 'report_title',
								type: 'string',
								value:
									"={{ '【' + $('Analysis Parameters').item.json.keyword + '】热点分析报告 (' + $('Analysis Parameters').item.json.search_date + ')' }}",
							},
							{
								id: '9380ff58-c183-4f97-a588-35a7d06a8085',
								name: 'report_content',
								type: 'string',
								value: '={{ $json.output }}',
							},
							{
								id: '915a7cac-30dd-44fc-8b1b-4c5fbc29cbff',
								name: 'analysis_summary',
								type: 'string',
								value:
									"={{ '本次分析共合并了 ' + $('Merge: All Sources').all().length + ' 条原始数据，筛选后深度分析了 ' + $('Aggregate: Relevant Items').item.json.data.length + ' 条高价值内容。' }}",
							},
						],
					},
				},
				position: [-120, 240],
				name: 'Format Report Payloads',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.googleSheets',
			version: 4.6,
			config: {
				parameters: {
					operation: 'append',
					sheetName: { __rl: true, mode: 'list', value: '' },
					documentId: { __rl: true, mode: 'list', value: '' },
				},
				credentials: {
					googleSheetsOAuth2Api: {
						id: 'credential-id',
						name: 'googleSheetsOAuth2Api Credential',
					},
				},
				position: [140, 480],
				name: 'Archive Data',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.set',
			version: 3.4,
			config: {
				parameters: {
					options: {},
					assignments: {
						assignments: [
							{
								id: '76202dc1-18f1-47eb-b533-14395a4c01ab',
								name: 'final_report_text',
								type: 'string',
								value:
									"={{ $json.report_title + '\\n\\n**分析概要**:\\n' + $json.analysis_summary + '\\n\\n**详细报告**:\\n' + $json.report_content }}",
							},
						],
					},
				},
				position: [120, 0],
				name: 'Splicing final report',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.gmail',
			version: 2.1,
			config: {
				parameters: {
					message: '={{ $json.final_report_text }}',
					options: {},
					subject: "={{ $('Format Report Payloads').item.json.report_title }}",
				},
				credentials: {
					gmailOAuth2: { id: 'credential-id', name: 'gmailOAuth2 Credential' },
				},
				position: [320, 0],
				name: 'Send HTML Report',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					method: 'POST',
					options: {},
					sendBody: true,
					bodyParameters: {
						parameters: [
							{ name: 'msg_type', value: 'interactive' },
							{
								name: 'card',
								value:
									'={{\n  {\n    "config": {\n      "wide_screen_mode": true\n    },\n    "header": {\n      "template": "blue",\n      "title": {\n        "tag": "plain_text",\n        "content": $json.report_title\n      }\n    },\n    "elements": [\n      {\n        "tag": "div",\n        "text": {\n          "tag": "lark_md",\n          "content": $json.analysis_summary\n        }\n      },\n      {\n        "tag": "hr"\n      },\n      {\n        "tag": "note",\n        "elements": [\n          {\n            "tag": "plain_text",\n            "content": "✅ 报告已生成，完整的详细报告已发送至您的Gmail邮箱。"\n          }\n        ]\n      }\n    ]\n  }\n}}',
							},
						],
					},
				},
				position: [140, 240],
				name: 'Send Feishu Card',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.reddit',
			version: 1,
			config: {
				parameters: {
					keyword: "={{ $('Analysis Parameters').item.json.keyword }}",
					location: 'allReddit',
					operation: 'search',
					additionalFields: {},
				},
				credentials: {
					redditOAuth2Api: { id: 'credential-id', name: 'redditOAuth2Api Credential' },
				},
				position: [-2940, 160],
				name: 'Reddit: Search Posts',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.twitter',
			version: 2,
			config: {
				parameters: {
					operation: 'search',
					searchText: '={{ $json.keyword }}',
					additionalFields: {},
				},
				credentials: {
					twitterOAuth2Api: { id: 'credential-id', name: 'twitterOAuth2Api Credential' },
				},
				position: [-2940, 520],
				name: 'X: Search Tweets',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.apify.com/v2/acts/nfp1fpt5gUlBwPcor/run-sync-get-dataset-items',
					options: {},
					sendQuery: true,
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
					queryParameters: {
						parameters: [
							{
								name: 'input',
								value:
									'=={{ JSON.stringify({\n    "queries": [$("Analysis Parameters").item.json.keyword],\n    "tweets_desired": 20,\n    "proxyConfiguration": {\n        "useApifyProxy": true\n    }\n}) }}',
							},
						],
					},
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [-2780, 1120],
				name: 'Apify抓取x推文',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.scrapingbee.com/api/v1',
					options: {},
					sendQuery: true,
					authentication: 'genericCredentialType',
					genericAuthType: 'httpQueryAuth',
					queryParameters: {
						parameters: [
							{
								name: 'url',
								value: '={{ "https://x.com/search?q=" + encodeURIComponent($json.keyword) }}',
							},
							{ name: 'render_js', value: 'true' },
							{ name: 'wait', value: '3000' },
						],
					},
				},
				credentials: {
					httpQueryAuth: { id: 'credential-id', name: 'httpQueryAuth Credential' },
				},
				position: [-2980, 1120],
				name: 'ScrapingBee抓取x推文',
			},
		}),
	)
	.add(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.twitterapi.io/twitter/user/last_tweets',
					options: {},
					sendQuery: true,
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
					queryParameters: {
						parameters: [
							{
								name: 'userName',
								value: "={{ $('分成多条').item.json.users }}",
							},
							{ name: 'cursor', value: '={{ $json.cursor }}' },
						],
					},
				},
				credentials: {
					httpHeaderAuth: { id: 'credential-id', name: 'httpHeaderAuth Credential' },
				},
				position: [-2580, 1120],
				name: 'twitterapi抓取x推文',
			},
		}),
	)
	.add(
		sticky(
			'## X Third-party scraping tools\nX API is relatively easy to configure and suitable for quick start-up, but they offer limited free quotas. Here are three third-party scraping tools. Please refer to the official documentation for configuration instructions.',
			{ name: 'Sticky Note1', color: 6, position: [-2980, 840], width: 260, height: 240 },
		),
	)
	.add(
		sticky('## llm node\nJust change it to your usual one.', {
			color: 6,
			position: [-2040, 700],
			width: 220,
			height: 140,
		}),
	)
	.add(
		sticky(
			'## URL configuration settings\n\nFeishu Group Chat - Settings - Create a new robot to obtain the webhook, then fill it in.',
			{ name: 'Sticky Note2', color: 6, position: [380, 220] },
		),
	);
