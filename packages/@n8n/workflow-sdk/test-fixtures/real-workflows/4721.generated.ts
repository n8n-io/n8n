const wf = workflow('gMlV2BS7Aj3XlgCC', 'Lead Magnet Agent - Trigify', { executionOrder: 'v1' })
	.add(
		trigger({
			type: '@n8n/n8n-nodes-langchain.chatTrigger',
			version: 1.1,
			config: {
				parameters: { options: {} },
				position: [2000, 340],
				name: 'When chat message received',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 1.7,
			config: {
				parameters: {
					text: '={{ $json.chatInput }}',
					options: {
						systemMessage:
							'=# AgentInstructions\n\n## Role\n\n### Name\nSearch Query Refiner Agent\n\n### Description\nThis agent refines a user\'s topic into five targeted, high-quality search queries for deep research. When the topic involves Trigify, the agent will first use the Perplexity tool to gather context about Trigify\'s capabilities, then use the Trigify knowledge hub2 to gather specific information. It returns the queries in a JSON structure that includes the original topic. The agent must remain strictly focused on the user\'s stated topic and avoid introducing unrelated or tangential concepts.\n\n## Goal\n\n### Primary\nTo provide five well-crafted, distinct, and highly relevant search queries based solely on the user\'s stated topic. These search queries must be geared towards doing deep research on the subject as if someone was typing these questions or statements into a search engine in order to conduct research. When the topic involves Trigify, the queries should be optimized to leverage Trigify\'s specific capabilities and use cases.\n\n## Instructions\n\n1. **Analyze User Input**:\n   - Identify the exact concepts or keywords in the user\'s topic\n   - Determine if the topic mentions or relates to Trigify\n   - Do NOT introduce new or tangential themes unless explicitly included in the user\'s topic\n\n2. **For Trigify-Related Topics**:\n   - First call the Perplexity tool to gather general information about what Trigify does, its features, and typical use cases\n   - Then call the Trigify knowledge hub2 to gather specific information about Trigify\'s capabilities relevant to the user\'s topic\n   - Use this gathered information to craft more targeted and effective queries\n\n3. **Maintain Topic Focus**:\n   - Avoid generalizing or substituting terms that alter the user\'s focus\n   - If the user specifically mentions certain aspects of Trigify (e.g., "booking meetings"), keep that exact focus\n\n4. **Generate Queries**:\n   - Create exactly five unique search queries\n   - Each query should include:\n     - The main keywords from the user\'s input\n     - Minor variations or synonyms that preserve the same narrow focus\n     - For Trigify topics: specific features, methodologies, or use cases discovered from the knowledge tools\n\n5. **Output Format**:\n   - Return the final result as JSON:\n   ```json\n   {\n     "topic": "USER_INPUT_TOPIC",\n     "searchQueries": [\n       "QUERY_1",\n       "QUERY_2",\n       "QUERY_3",\n       "QUERY_4",\n       "QUERY_5"\n     ]\n   }\n   ```\n\n6. **Respect Research Scope**:\n   - Stay within the user\'s desired research scope\n   - For non-Trigify topics, avoid adding any reference to Trigify\n   - For Trigify topics, ensure queries are relevant to creating effective lead magnets about Trigify\'s capabilities\n\n## Examples\n\n### Example 1 (Trigify-related)\n\n#### UserInput\nBuild a Lead Magnet on how you can use Trigify to book 30+ meetings per week\n\n#### Agent Process\n1. Identifies this is a Trigify-related topic\n2. Calls Perplexity tool to understand Trigify\'s basic functionality\n3. Calls Trigify knowledge hub2 to gather specific information about meeting booking features\n4. Crafts specialized queries focused on Trigify\'s meeting booking capabilities\n\n#### AgentOutput\n```json\n{\n  "topic": "Build a Lead Magnet on how you can use Trigify to book 30+ meetings per week",\n  "searchQueries": [\n    "Trigify outreach automation strategies for booking 30+ weekly meetings",\n    "Trigify sequencing templates for high-volume meeting conversion",\n    "Optimizing Trigify campaigns for maximum meeting bookings",\n    "Trigify prospect targeting techniques for sales meeting generation",\n    "Trigify analytics to improve meeting booking rates"\n  ]\n}\n```\n\n### Example 2 (Non-Trigify)\n\n#### UserInput\nquantum computing hardware\n\n#### AgentOutput\n```json\n{\n  "topic": "quantum computing hardware",\n  "searchQueries": [\n    "quantum computing hardware architecture",\n    "latest developments in quantum processors",\n    "superconducting qubits hardware advancements",\n    "ion trap quantum computing devices",\n    "scalability challenges quantum hardware research"\n  ]\n}\n```\n\n### Example 3 (Trigify-related)\n\n#### UserInput\nusing Trigify for LinkedIn outreach\n\n#### Agent Process\n1. Identifies this is a Trigify-related topic\n2. Uses knowledge tools to understand Trigify\'s LinkedIn capabilities\n3. Crafts specialized queries focused on Trigify\'s LinkedIn features\n\n#### AgentOutput\n```json\n{\n  "topic": "using Trigify for LinkedIn outreach",\n  "searchQueries": [\n    "Trigify LinkedIn connection request automation best practices",\n    "Trigify personalization techniques for LinkedIn messaging",\n    "Trigify campaign analytics for LinkedIn outreach optimization",\n    "Trigify LinkedIn profile targeting strategies",\n    "Comparing Trigify LinkedIn outreach performance to manual methods"\n  ]\n}\n```',
					},
					promptType: 'define',
					hasOutputParser: true,
				},
				subnodes: {
					tools: [
						tool({
							type: '@n8n/n8n-nodes-langchain.toolWorkflow',
							version: 2,
							config: {
								parameters: {
									name: 'Perplexity_tool',
									workflowId: {
										__rl: true,
										mode: 'list',
										value: '[REDACTED_WORKFLOW_ID]',
										cachedResultName: 'Trigify Agents — My Sub-Workflow 2',
									},
									description: 'Call this tool to run your research.',
									workflowInputs: {
										value: {},
										schema: [],
										mappingMode: 'defineBelow',
										matchingColumns: [],
										attemptToConvertTypes: false,
										convertFieldsToString: false,
									},
								},
								name: 'Perplexity tool',
							},
						}),
						tool({
							type: '@n8n/n8n-nodes-langchain.toolHttpRequest',
							version: 1.1,
							config: {
								parameters: {
									url: 'https://www.chatbase.co/api/v1/chat',
									method: 'POST',
									jsonBody:
										'{\n  "messages": [\n    {\n      "role": "user",\n      "content": "{placeholder}"\n    }\n  ],\n  "chatbotId": "[REDACTED_CHATBOT_ID]",\n  "stream": false,\n  "temperature": 0,\n  "model": "claude-3-5-sonnet"\n}',
									sendBody: true,
									sendHeaders: true,
									specifyBody: 'json',
									toolDescription: 'Trigify knowledge hub.',
									parametersHeaders: {
										values: [
											{
												name: 'Authorization',
												value: 'Bearer [REDACTED_API_TOKEN]',
												valueProvider: 'fieldValue',
											},
											{
												name: 'Content-Type',
												value: 'application/json',
												valueProvider: 'fieldValue',
											},
										],
									},
								},
								name: 'Trigify knowledge hub2',
							},
						}),
					],
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatOpenRouter',
						version: 1,
						config: {
							parameters: { model: 'anthropic/claude-3.7-sonnet:thinking', options: {} },
							credentials: {
								openRouterApi: { id: 'credential-id', name: 'openRouterApi Credential' },
							},
							name: 'OpenRouter Chat Model1',
						},
					}),
					outputParser: outputParser({
						type: '@n8n/n8n-nodes-langchain.outputParserStructured',
						version: 1.2,
						config: {
							parameters: {
								jsonSchemaExample:
									'{\n  "topic": "USER_INPUT_TOPIC",\n  "searchQueries": [\n    "QUERY_1",\n    "QUERY_2",\n    "QUERY_3",\n    "QUERY_4",\n    "QUERY_5"\n  ]\n}',
							},
							name: 'Structured Output Parser',
						},
					}),
				},
				position: [2200, 280],
				name: 'Query Builder',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 1.7,
			config: {
				parameters: {
					text: '=Research the following topics:\n{{ $json.output.searchQueries[0] }}\n{{ $json.output.searchQueries[1] }}\n{{ $json.output.searchQueries[2] }}\n{{ $json.output.searchQueries[3] }}\n{{ $json.output.searchQueries[4] }}\n',
					options: {
						systemMessage:
							"=You are Research Leader specialized in comprehensive topic analysis, research and content\nstructuring. Your task is to create an enriched, research-backed table of contents for a given topic.\n\n**Context - This is a Lead Magnet you are writing which I will be posting on LinkedIn. The idea is to create something that has been written by my company Trigify. The insights you pull need to be actionable steps the idea being someone reads it and can implement the step by step tasks.**\n\nFollow these steps:\n1. Analyze the provided topic thoroughly and determine research approach:\n   - If topic is related to Trigify: First use Perplexity tool to understand Trigify's general capabilities, then use Trigify knowledge hub2 as primary information source\n   - If topic is not related to Trigify: Use Perplexity tool for comprehensive research\n\n2. Conduct targeted research:\n   - For Trigify topics: Query Trigify knowledge hub2 for specific product features, capabilities, use cases, and methodologies\n   - For non-Trigify topics: Use Perplexity to gather current insights, trends, and expert perspectives\n\n3. Synthesize the gathered information to identify:\n   - Core concepts and principles\n   - Current trends and developments\n   - Expert opinions and best practices\n   - Real-world applications and examples\n   - Potential challenges and solutions\n   - For Trigify topics: Specific Trigify features and implementation approaches\n\n4. Create a comprehensive table of contents that:\n   - Reflects both foundational knowledge and current developments\n   - Incorporates relevant case studies and examples\n   - Addresses common questions and concerns\n   - Includes practical applications and future implications\n   - For Trigify topics: Highlights step-by-step implementation using Trigify tools\n\n5. Structure the content hierarchically, ensuring:\n   - Logical flow and progression\n   - Clear relationships between sections\n   - Balanced coverage of theoretical and practical aspects\n   - Integration of research-backed insights\n   - For Trigify topics: Actionable implementation guides\n\nPlease format your response as follows:\n\n**Topic Analysis:**\n(Brief overview of the topic and its significance based on current research. For Trigify topics, include specific mention of how Trigify addresses this area.)\n\n**Key Research Insights:**\n- [Insight 1 from research]\n- [Insight 2 from research]\n- [Insight 3 from research]\n(For Trigify topics, include specific insights from the Trigify knowledge hub2)\n\n**Proposed Table of Contents:**\n\nI. **Introduction**\n   A. Topic Overview and Current Relevance  \n   B. Key Trends and Developments  \n   C. Why This Matters Now  \n\nII. **Background and Context**  \n   A. Historical Development  \n   B. Fundamental Concepts  \n   C. Current State of the Field  \n\nIII. **[Main Theme 1 from Research]**  \n   A. [Key Finding/Aspect]  \n   B. [Expert Perspectives]  \n   C. [Real-world Applications]  \n\nIV. **[Main Theme 2 from Research]**  \n   A. [Key Finding/Aspect]  \n   B. [Case Studies]  \n   C. [Practical Implications]  \n\n[Continue with additional research-based sections]\n\nV. **Future Perspectives**  \n   A. Emerging Trends  \n   B. Potential Developments  \n   C. Recommendations  \n\nVI. **Conclusion**  \n   A. Summary of Key Insights  \n   B. Actionable Takeaways  \n   C. Final Thoughts  \n\n**Research Sources:**  \n[List of key sources consulted, including Trigify knowledge hub2 if applicable]\n\n**Usage Instructions:**\n1. Provide a specific topic you want to analyze.\n2. The AI will determine the appropriate research approach:\n   - For Trigify-related topics: Primary information from Trigify knowledge hub2, supplemented by Perplexity\n   - For non-Trigify topics: Comprehensive research using Perplexity\n3. Based on the research, it will generate a comprehensive, current, and well-structured table of contents.\n4. Each section will be enriched with recent findings and expert insights.\n5. For Trigify topics, the content will emphasize actionable implementation steps using Trigify's specific tools and methodologies.\n6. The final structure will be suitable for various content formats (blog posts, articles, whitepapers) and optimized for LinkedIn sharing.\n\nToday's date is {{ $now }}",
					},
					promptType: 'define',
				},
				subnodes: {
					tools: [
						tool({
							type: '@n8n/n8n-nodes-langchain.toolWorkflow',
							version: 2,
							config: {
								parameters: {
									name: 'Perplexity_tool',
									workflowId: {
										__rl: true,
										mode: 'list',
										value: '[REDACTED_WORKFLOW_ID]',
										cachedResultName: 'Trigify Agents — My Sub-Workflow 2',
									},
									description: 'Call this tool to run your research.',
									workflowInputs: {
										value: {},
										schema: [],
										mappingMode: 'defineBelow',
										matchingColumns: [],
										attemptToConvertTypes: false,
										convertFieldsToString: false,
									},
								},
								name: 'Perplexity tool',
							},
						}),
						tool({
							type: '@n8n/n8n-nodes-langchain.toolHttpRequest',
							version: 1.1,
							config: {
								parameters: {
									url: 'https://www.chatbase.co/api/v1/chat',
									method: 'POST',
									jsonBody:
										'{\n  "messages": [\n    {\n      "role": "user",\n      "content": "{placeholder}"\n    }\n  ],\n  "chatbotId": "[REDACTED_CHATBOT_ID]",\n  "stream": false,\n  "temperature": 0,\n  "model": "claude-3-5-sonnet"\n}',
									sendBody: true,
									sendHeaders: true,
									specifyBody: 'json',
									toolDescription: 'Trigify knowledge hub.',
									parametersHeaders: {
										values: [
											{
												name: 'Authorization',
												value: 'Bearer [REDACTED_API_TOKEN]',
												valueProvider: 'fieldValue',
											},
											{
												name: 'Content-Type',
												value: 'application/json',
												valueProvider: 'fieldValue',
											},
										],
									},
								},
								name: 'Trigify knowledge hub2',
							},
						}),
					],
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
						version: 1.2,
						config: {
							parameters: { model: '=claude-3-7-sonnet-20250219', options: {} },
							credentials: {
								anthropicApi: { id: 'credential-id', name: 'anthropicApi Credential' },
							},
							name: 'Anthropic Chat Model1',
						},
					}),
				},
				position: [2600, 280],
				name: 'Research Leader',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 1.7,
			config: {
				parameters: {
					text: '=Write the title, the subtitle, the chapters details, the introduction, the conclusions.\nPlease use this set of topics to create chapters:  \n{{ $json.output }}\n\n### Research Process\n1. Analyze the provided topics thoroughly and determine research approach:\n   - If topics are related to Trigify: First use Perplexity tool to understand Trigify\'s general capabilities, then use Trigify knowledge hub2 as primary information source\n   - If topics are not related to Trigify: Use Perplexity tool for comprehensive research\n\n2. Gather in-depth information:\n   - For Trigify topics: Query Trigify knowledge hub2 for specific product features, capabilities, use cases, methodologies, and real implementation examples\n   - For non-Trigify topics: Use Perplexity to gather current insights, trends, expert perspectives, and practical applications\n\n3. Ensure content is deeply researched, action-oriented, and provides step-by-step implementation guidance\n\n### Instructions:\n- Place the article title in a JSON field called `title`.\n- Place the subtitle in a JSON field called `subtitle`.\n- Place the introduction in a JSON field called `introduction`.\n  - The introduction should introduce the topic that is then explored in depth in the rest of the text.\n  - The introduction should be around 100 words.\n  - For Trigify topics: Highlight Trigify\'s unique approach to solving the problem\n- Place the conclusions in a JSON field called `conclusions`.\n  - The conclusions should be around 100 words.\n  - Use the conclusions to sum all said in the article and offer a conclusion to the reader.\n  - For Trigify topics: Emphasize the specific benefits and outcomes of implementing Trigify solutions\n  \n- For each chapter, provide a title and an exhaustive prompt that will be used to write the chapter text.\n  - Place the chapters in an array field called `chapters`.\n  - For each chapter, provide the fields `"title"` and `"prompt"`.\n  - The chapters should follow a logical flow and not repeat the same concepts.\n  - The chapters should be one related to the other and not isolated blocks of text.\n  - The text should be fluent and follow a linear logic.\n  - For Trigify topics: Each chapter prompt should:\n    - Include specific Trigify features, tools, or methodologies relevant to that section\n    - Incorporate proven implementation steps from the Trigify knowledge hub2\n    - Reference actual use cases or success patterns from Trigify customers when available\n\n- Don\'t start the chapters with `"Chapter 1"`, `"Chapter 2"`, `"Chapter 3"`... just write the title of the chapter.\n- For the title and the chapters\' titles, don\'t use colons `(:)`.\n- Please use this text format.\n- Please write in a style that is informative and instructional so the user can follow your advice and action what you\'re saying, they need step by step breakdowns on how to execute on what you\'re saying.\n- Go deep into the topic you treat, don\'t just throw some superficial info.\n- The article should serve as a resource to do research on the topics needed to create the chapters.\n- Ensure each chapter prompt guides the creation of content that contains:\n  - Clear, numbered step-by-step instructions where applicable\n  - Specific implementation details and technical guidance\n  - Common pitfalls to avoid and how to overcome them\n  - Metrics for measuring success\n  - For Trigify topics: Specific Trigify configurations, settings, or workflows\n\n**Today\'s date is {{ $now }}**\n**Context - This is a Lead Magnet you are writing which I will be posting on LinkedIn. The idea is to create something that has been written by my company Trigify. The insights you pull need to be actionable steps the idea being someone reads it and can implement the step by step tasks.**',
					options: {},
					promptType: 'define',
					hasOutputParser: true,
				},
				subnodes: {
					tools: [
						tool({
							type: '@n8n/n8n-nodes-langchain.toolWorkflow',
							version: 2,
							config: {
								parameters: {
									name: 'Perplexity_tool',
									workflowId: {
										__rl: true,
										mode: 'list',
										value: '[REDACTED_WORKFLOW_ID]',
										cachedResultName: 'Trigify Agents — My Sub-Workflow 2',
									},
									description: 'Call this tool to run your research.',
									workflowInputs: {
										value: {},
										schema: [],
										mappingMode: 'defineBelow',
										matchingColumns: [],
										attemptToConvertTypes: false,
										convertFieldsToString: false,
									},
								},
								name: 'Perplexity tool',
							},
						}),
						tool({
							type: '@n8n/n8n-nodes-langchain.toolHttpRequest',
							version: 1.1,
							config: {
								parameters: {
									url: 'https://www.chatbase.co/api/v1/chat',
									method: 'POST',
									jsonBody:
										'{\n  "messages": [\n    {\n      "role": "user",\n      "content": "{placeholder}"\n    }\n  ],\n  "chatbotId": "[REDACTED_CHATBOT_ID]",\n  "stream": false,\n  "temperature": 0,\n  "model": "claude-3-5-sonnet"\n}',
									sendBody: true,
									sendHeaders: true,
									specifyBody: 'json',
									toolDescription: 'Trigify knowledge hub.',
									parametersHeaders: {
										values: [
											{
												name: 'Authorization',
												value: 'Bearer [REDACTED_API_TOKEN]',
												valueProvider: 'fieldValue',
											},
											{
												name: 'Content-Type',
												value: 'application/json',
												valueProvider: 'fieldValue',
											},
										],
									},
								},
								name: 'Trigify knowledge hub2',
							},
						}),
					],
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatOpenRouter',
						version: 1,
						config: {
							parameters: { model: 'anthropic/claude-3.7-sonnet:thinking', options: {} },
							credentials: {
								openRouterApi: { id: 'credential-id', name: 'openRouterApi Credential' },
							},
							name: 'OpenRouter Chat Model1',
						},
					}),
					outputParser: outputParser({
						type: '@n8n/n8n-nodes-langchain.outputParserStructured',
						version: 1.2,
						config: {
							parameters: {
								jsonSchemaExample:
									'{\n  "title": "Dynamic AI-Generated Content Example",\n  "subtitle": "A Flexible JSON Structure for AI Content Creation",\n  "introduction": "This JSON example demonstrates a structured yet flexible approach for AI-generated content. The number of chapters can vary based on the context, ensuring adaptability for different types of content generation.",\n  "conclusions": "By using a dynamic JSON structure, AI-generated content remains adaptable to varying requirements. The number of sections and prompts can scale up or down based on the use case, ensuring a customised approach to content creation.",\n  "chapters": [\n    {\n      "title": "Introduction to AI Content Structuring",\n      "prompt": "Explain how AI structures content dynamically, adapting to different contexts and varying numbers of sections."\n    },\n    {\n      "title": "Flexible JSON Formatting",\n      "prompt": "Demonstrate how JSON allows for variable-length content sections, making AI-generated documents scalable and adaptable."\n    },\n    {\n      "title": "Additional Section (If Needed)",\n      "prompt": "This section is an example of how the AI can generate more or fewer sections depending on the content requirements."\n    }\n  ]\n}',
							},
							name: 'Structured Output Parser1',
						},
					}),
				},
				position: [2960, 280],
				name: 'Project Planner',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.splitOut',
			version: 1,
			config: {
				parameters: { options: {}, fieldToSplitOut: 'output.chapters' },
				position: [3320, 280],
				name: 'Split Out',
			},
		}),
	)
	.output(0)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 1.7,
			config: {
				parameters: {
					text: "=Write a chapter for this article -> {{ $('Project Planner').item.json.output.title }}\n\nwrite a chapter for -> {{ $json.title }} that {{ $json.prompt }}\n\nMake sure to use the Trigify knowledge hub.",
					options: {
						systemMessage:
							'=You are a dedicated Research Assistant AI agent, working as part of a research team under the guidance of a Research Leader and Project Planner. Your task is to write a chapter in the article as part of the overall research into a topic.\n\n**Context - This is a Lead Magnet you are writing which I will be posting on LinkedIn. The idea is to create something that has been written by my company Trigify. The insights you pull need to be actionable steps the idea being someone reads it and can implement the step by step tasks.**\n\nGuidelines:\n- Just return the plain text for each chapter (no JSON structure).\n- Use the perplexity_ai_search tool to research the topic in the chapter.\n- Use html format for output\n- Don\'t add internal titles or headings.\n- The length of each chapter should be around 120 words\nwords long—go deep in the topic you treat, don\'t just throw some superficial info.\n\nWe are currently writing chapter #{{ $itemIndex + 1 }} of {{ $items("Project Planner")[0].json.output.chapters.length }}.\n\nPrevious chapter:\n{{ $itemIndex > 0 ? $items("Project Planner")[0].json.output.chapters[$itemIndex - 1].title : "None" }}\n\nNext chapter:\n{{ $itemIndex < $items("Project Planner")[0].json.output.chapters.length - 1 ? $items("Project Planner")[0].json.output.chapters[$itemIndex + 1].title : "None" }}\n\nCurrent chapter:\n{{ $json["title"] }}\n\nPrompt:\n{{ $json["prompt"] }}\n\n- Consider the previous and following chapters when writing the text for this chapter. The text must be coherent with the previous and following chapters.\n- This chapter should not repeat the concepts already exposed in the previous chapter.\n- This chapter is part of a larger article so don\'t include an introduction or conclusions. This chapter should merge seamlessly with the rest of the article.\n- Please write in a style that is educational for the user so they can follow your advice step by step and action your research.\n- For Trigify topics: Reference specific Trigify functionalities, configurations, and success metrics from the Trigify knowledge hub2\n- For non-Trigify topics: Use the perplexity online tool as source of information\n\nCitation Guidelines:\n- For Trigify topics:\n  - Cite information from the Trigify knowledge hub2 as: <a href="#">[Source: Trigify Knowledge Hub]</a>\n  - Use Perplexity for supplementary research and cite according to standard guidelines\n\n- For non-Trigify topics:\n  - Use the perplexity_ai_search tool to gather information and cite sources.\n  - Include citations properly as a source of information, include a hyperlinked inline citation\n  - Format citations as HTML links with descriptive text:\n  <a href="[URL]">[Source: Publication Name]</a>\n\nExample of proper citation format:\n- "According to recent data <a href="https://www.mckinsey.com/article-url">[Source: McKinsey & Company]</a>..."\n- When directly quoting from a source, use quotation marks and include the citation\n\nFor Trigify topics, ensure the chapter includes:\n- Specific Trigify features or tools relevant to the topic\n- Step-by-step implementation guidance using Trigify\n- Real-world applications or success metrics from Trigify users\n- Technical details on configuration or setup where applicable',
					},
					promptType: 'define',
				},
				subnodes: {
					tools: [
						tool({
							type: '@n8n/n8n-nodes-langchain.toolWorkflow',
							version: 2,
							config: {
								parameters: {
									name: 'Perplexity_tool',
									workflowId: {
										__rl: true,
										mode: 'list',
										value: '[REDACTED_WORKFLOW_ID]',
										cachedResultName: 'Trigify Agents — My Sub-Workflow 2',
									},
									description: 'Call this tool to run your research.',
									workflowInputs: {
										value: {},
										schema: [],
										mappingMode: 'defineBelow',
										matchingColumns: [],
										attemptToConvertTypes: false,
										convertFieldsToString: false,
									},
								},
								name: 'Perplexity tool',
							},
						}),
						tool({
							type: '@n8n/n8n-nodes-langchain.toolHttpRequest',
							version: 1.1,
							config: {
								parameters: {
									url: 'https://www.chatbase.co/api/v1/chat',
									method: 'POST',
									jsonBody:
										'{\n  "messages": [\n    {\n      "role": "user",\n      "content": "{placeholder}"\n    }\n  ],\n  "chatbotId": "[REDACTED_CHATBOT_ID]",\n  "stream": false,\n  "temperature": 0,\n  "model": "claude-3-5-sonnet"\n}',
									sendBody: true,
									sendHeaders: true,
									specifyBody: 'json',
									toolDescription: 'Trigify knowledge hub.',
									parametersHeaders: {
										values: [
											{
												name: 'Authorization',
												value: 'Bearer [REDACTED_API_TOKEN]',
												valueProvider: 'fieldValue',
											},
											{
												name: 'Content-Type',
												value: 'application/json',
												valueProvider: 'fieldValue',
											},
										],
									},
								},
								name: 'Trigify knowledge hub',
							},
						}),
					],
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatOpenRouter',
						version: 1,
						config: {
							parameters: { model: 'anthropic/claude-3.7-sonnet:thinking', options: {} },
							credentials: {
								openRouterApi: { id: 'credential-id', name: 'openRouterApi Credential' },
							},
							name: 'OpenRouter Chat Model1',
						},
					}),
				},
				position: [3520, 280],
				name: 'Team of Research Assistants',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.merge',
			version: 3,
			config: {
				parameters: {
					mode: 'combine',
					options: {},
					combineBy: 'combineByPosition',
				},
				position: [3900, 280],
				name: 'Merge',
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
						'const mergeData = $input.all().map((item) => item.json);\nconst combinedData = [];\n\nmergeData.forEach((item) => {\n  combinedData.push(item.title, item.output);\n});\n\nreturn { combinedData };\n',
				},
				position: [4060, 280],
				name: 'Code',
			},
		}),
	)
	.then(
		node({
			type: '@n8n/n8n-nodes-langchain.agent',
			version: 1.7,
			config: {
				parameters: {
					text: '=Edit this text into a nice article: {{ $json.combinedData }}\n\n**Context - This is a Lead Magnet you are writing which I will be posting on LinkedIn. The idea is to create something that has been written by my company Trigify. The insights you pull need to be actionable steps the idea being someone reads it and can implement the step by step tasks.**\n\nI want the text to be structured so that it looks like its being written by me (Max Mitcham). The idea being is it comes across authentic if its more of a casual tone and style of writing.',
					options: {
						systemMessage:
							'=# Expert Editing Guidelines\n\nYou are an expert Editor specializing in refining and polishing content to ensure it meets the highest quality standards. Your role is to review and improve the written material produced by multiple writers while maintaining academic integrity and proper source attribution. Your task is to make this Lead Magnet flow and aim to have the style of the writing be written like its come from myself (Max Mitcham), its needs to be formal but casual style of writing.\n\nAdd placeholders where you feel I should add images by doing {Add image here of X}\n\n---\n\n## Content Review Instructions:\n- Carefully read the entire content piece.\n- Check for grammar, spelling, and punctuation errors.\n- Ensure consistency in tone, style, and voice throughout the piece.\n- Verify that the content aligns with the original brief and project requirements.\n- Improve sentence structure and flow for better readability.\n- Optimize headlines, subheadings, and formatting for better engagement, especially for SEO.\n- Suggest improvements or additions to enhance the overall quality of the content.\n\n---\n',
					},
					promptType: 'define',
					hasOutputParser: true,
				},
				subnodes: {
					model: languageModel({
						type: '@n8n/n8n-nodes-langchain.lmChatAnthropic',
						version: 1.2,
						config: {
							parameters: { model: '=claude-3-7-sonnet-20250219', options: {} },
							credentials: {
								anthropicApi: { id: 'credential-id', name: 'anthropicApi Credential' },
							},
							name: 'Anthropic Chat Model',
						},
					}),
				},
				position: [4240, 280],
				name: 'Editor',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleDocs',
			version: 2,
			config: {
				parameters: {
					title: '={{ $node["Project Planner"].json["output"]["title"] }}',
					folderId: '[REDACTED_FOLDER_ID]',
				},
				credentials: {
					googleDocsOAuth2Api: { id: 'credential-id', name: 'googleDocsOAuth2Api Credential' },
				},
				position: [4560, 280],
				name: 'Google Docs',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleDocs',
			version: 2,
			config: {
				parameters: {
					actionsUi: {
						actionFields: [
							{
								text: "={{ $('Editor').item.json.output }}",
								action: 'insert',
							},
						],
					},
					operation: 'update',
					documentURL: '={{ $json.id }}',
				},
				credentials: {
					googleDocsOAuth2Api: { id: 'credential-id', name: 'googleDocsOAuth2Api Credential' },
				},
				position: [4720, 280],
				name: 'Google Docs1',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.googleDrive',
			version: 3,
			config: {
				parameters: {
					fileId: { __rl: true, mode: 'id', value: '={{ $json.documentId }}' },
					options: {},
					operation: 'share',
					permissionsUi: { permissionsValues: { role: 'reader', type: 'anyone' } },
				},
				credentials: {
					googleDriveOAuth2Api: {
						id: 'credential-id',
						name: 'googleDriveOAuth2Api Credential',
					},
				},
				position: [4880, 280],
				name: 'Google Drive',
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
								id: 'ff1378ca-ad8a-4656-a82b-2c85ccfdef35',
								name: 'field',
								type: 'string',
								value:
									"=https://docs.google.com/document/d/{{ $('Google Docs1').item.json.documentId }}",
							},
							{
								id: '11b66d56-cc3b-48ec-bee4-58f44340258d',
								name: "body['First Name']",
								type: 'string',
								value: '={{ $node["Webhook"].json["body"]["First Name"] }}',
							},
							{
								id: '03a9b312-31cb-4ec6-85a6-e75470e3392a',
								name: "body['Last Name']",
								type: 'string',
								value: '={{ $node["Webhook"].json["body"]["Last Name"] }}',
							},
							{
								id: '81f75a32-494c-4b4c-90b5-bbb0a903ae45',
								name: 'body.Domain',
								type: 'string',
								value: '={{ $node["Webhook"].json["body"]["Domain"] }}',
							},
							{
								id: 'c3bd15a0-d0f2-4ea6-bce4-cda3448fc112',
								name: "body['Full Name']",
								type: 'string',
								value: '={{ $node["Webhook"].json["body"]["Full Name"] }}',
							},
							{
								id: '5677ab97-6d17-4911-bebf-6582ddee31e7',
								name: "body['LinkedIn Url']",
								type: 'string',
								value: '={{ $node["Webhook"].json["body"]["LinkedIn Url"] }}',
							},
						],
					},
				},
				position: [5040, 280],
				name: 'Share URL',
			},
		}),
	);
