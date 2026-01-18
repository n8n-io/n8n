const wf = workflow('', '')
	.add(
		trigger({
			type: 'n8n-nodes-base.manualTrigger',
			version: 1,
			config: { position: [1184, 560], name: 'When clicking ‘Execute workflow’' },
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
								id: '774ed91a-11bd-4584-ad9c-418e9caf88df',
								name: 'prompt',
								type: 'string',
								value: '=YOUR_VIDEO_PROMPT_DESCRIPTION',
							},
							{
								id: 'f810bb1e-e54d-4fc8-9be7-72426902de3f',
								name: 'duration',
								type: 'string',
								value: '=5',
							},
							{
								id: '698c7fb7-c7e2-41d5-8d06-f5114d4a55d2',
								name: 'resolution',
								type: 'string',
								value: '=720p',
							},
						],
					},
				},
				position: [1392, 560],
				name: 'Set Video Parameters',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.kie.ai/api/v1/jobs/createTask',
					method: 'POST',
					options: {},
					jsonBody:
						'={\n  "model": "wan/2-6-text-to-video",\n    "input": {\n      "prompt": "{{ $json.prompt }}",\n      "duration": "{{ $json.duration }}",\n      "resolution": "{{ $json.resolution }}",\n      "multi_shots": false\n    }\n}',
					sendBody: true,
					specifyBody: 'json',
					authentication: 'genericCredentialType',
					genericAuthType: 'httpBearerAuth',
				},
				credentials: { httpBearerAuth: { id: 'vX52jw1dTyyouVZr', name: 'KIA.AI' } },
				position: [1616, 560],
				name: 'Submit Video Generation Request',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1,
			config: {
				parameters: { unit: 'seconds', amount: 5 },
				position: [1856, 560],
				name: 'Wait for Video Generation',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.kie.ai/api/v1/jobs/recordInfo',
					options: {},
					sendQuery: true,
					authentication: 'genericCredentialType',
					genericAuthType: 'httpBearerAuth',
					queryParameters: {
						parameters: [{ name: 'taskId', value: '={{ $json.data.taskId }}' }],
					},
				},
				credentials: { httpBearerAuth: { id: 'vX52jw1dTyyouVZr', name: 'KIA.AI' } },
				position: [2016, 560],
				name: 'Check Video Generation Status',
			},
		}),
	)
	.then(
		switchCase(
			[
				node({
					type: 'n8n-nodes-base.httpRequest',
					version: 4.2,
					config: {
						parameters: {
							url: 'https://api.kie.ai/api/v1/jobs/createTask',
							method: 'POST',
							options: {},
							jsonBody:
								'={\n  "model": "wan/2-6-text-to-video",\n    "input": {\n      "prompt": "{{ $json.prompt }}",\n      "duration": "{{ $json.duration }}",\n      "resolution": "{{ $json.resolution }}",\n      "multi_shots": false\n    }\n}',
							sendBody: true,
							specifyBody: 'json',
							authentication: 'genericCredentialType',
							genericAuthType: 'httpBearerAuth',
						},
						credentials: { httpBearerAuth: { id: 'vX52jw1dTyyouVZr', name: 'KIA.AI' } },
						position: [1616, 560],
						name: 'Submit Video Generation Request',
					},
				}),
				node({
					type: 'n8n-nodes-base.code',
					version: 2,
					config: {
						parameters: {
							jsCode:
								"// n8n Function node\nconst items = $input.all();\nconst out = [];\n\nfor (const item of items) {\n  // Your HTTP node sometimes returns an array at top-level\n  const payload = item.json;\n  const first = Array.isArray(payload) ? payload[0] : payload;\n\n  // Get the stringified resultJson safely\n  const resultJsonStr = first?.data?.resultJson ?? '';\n\n  // Parse and extract\n  let resultUrls = [];\n  try {\n    const parsed = JSON.parse(resultJsonStr);\n    resultUrls = parsed?.resultUrls ?? [];\n  } catch (e) {\n    // leave resultUrls as []\n  }\n\n  out.push({ json: { resultUrls } });\n}\n\nreturn out;\n",
						},
						position: [2448, 528],
						name: 'Extract Video URL',
					},
				}),
				node({
					type: 'n8n-nodes-base.wait',
					version: 1,
					config: {
						parameters: { unit: 'seconds', amount: 5 },
						position: [1856, 560],
						name: 'Wait for Video Generation',
					},
				}),
				node({
					type: 'n8n-nodes-base.wait',
					version: 1,
					config: {
						parameters: { unit: 'seconds', amount: 5 },
						position: [1856, 560],
						name: 'Wait for Video Generation',
					},
				}),
				node({
					type: 'n8n-nodes-base.wait',
					version: 1,
					config: {
						parameters: { unit: 'seconds', amount: 5 },
						position: [1856, 560],
						name: 'Wait for Video Generation',
					},
				}),
			],
			{
				version: 3.2,
				parameters: {
					rules: {
						values: [
							{
								outputKey: 'fail',
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
											id: 'fail-state-condition',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{ $json.data.state }}',
											rightValue: 'fail',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'success',
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
											id: 'success-state-condition',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{ $json.data.state }}',
											rightValue: 'success',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'generating',
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
											id: 'generating-state-condition',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{ $json.data.state }}',
											rightValue: 'generating',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'queuing',
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
											id: 'queuing-state-condition',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{ $json.data.state }}',
											rightValue: 'queuing',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'waiting',
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
											id: 'waiting-state-condition',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{ $json.data.state }}',
											rightValue: 'waiting',
										},
									],
								},
								renameOutput: true,
							},
						],
					},
					options: {},
				},
				name: 'Switch Video Generation Status',
			},
		),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.3,
			config: {
				parameters: { url: '={{ $json.resultUrls[0] }}', options: {} },
				position: [2624, 528],
				name: 'Download Video File',
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
								id: '774ed91a-11bd-4584-ad9c-418e9caf88df',
								name: 'prompt',
								type: 'string',
								value: '=YOUR_VIDEO_PROMPT_DESCRIPTION',
							},
							{
								id: 'f810bb1e-e54d-4fc8-9be7-72426902de3f',
								name: 'duration',
								type: 'string',
								value: '=5',
							},
							{
								id: '698c7fb7-c7e2-41d5-8d06-f5114d4a55d2',
								name: 'resolution',
								type: 'string',
								value: '=720p',
							},
							{
								id: 'eac7bc3a-db33-4a87-b073-c6cb7a67ac5f',
								name: 'video_urls',
								type: 'string',
								value: '=https://static.aiquickdraw.com/tools/example/1765957777782_cNJpvhRx.mp4',
							},
						],
					},
				},
				position: [1440, 1696],
				name: 'Set Video URL and Prompt',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.kie.ai/api/v1/jobs/createTask',
					method: 'POST',
					options: {},
					jsonBody:
						'={\n  "model": "wan/2-6-video-to-video",\n    "input": {\n      "prompt": "{{ $json.prompt }}",\n      "video_urls": [\n        "{{ $json.video_urls }}"\n      ],\n      "duration": "{{ $json.duration }}",\n      "resolution": "{{ $json.resolution }}",\n      "multi_shots": false\n    }\n}',
					sendBody: true,
					specifyBody: 'json',
					authentication: 'genericCredentialType',
					genericAuthType: 'httpBearerAuth',
				},
				credentials: { httpBearerAuth: { id: 'vX52jw1dTyyouVZr', name: 'KIA.AI' } },
				position: [1632, 1696],
				name: 'Submit Video Generation',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1,
			config: {
				parameters: { unit: 'seconds', amount: 5 },
				position: [1872, 1696],
				name: 'Wait for Video-to-Video Generation',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.kie.ai/api/v1/jobs/recordInfo',
					options: {},
					sendQuery: true,
					authentication: 'genericCredentialType',
					genericAuthType: 'httpBearerAuth',
					queryParameters: {
						parameters: [{ name: 'taskId', value: '={{ $json.data.taskId }}' }],
					},
				},
				credentials: { httpBearerAuth: { id: 'vX52jw1dTyyouVZr', name: 'KIA.AI' } },
				position: [2032, 1696],
				name: 'Check Video Generation',
			},
		}),
	)
	.then(
		switchCase(
			[
				node({
					type: 'n8n-nodes-base.httpRequest',
					version: 4.2,
					config: {
						parameters: {
							url: 'https://api.kie.ai/api/v1/jobs/createTask',
							method: 'POST',
							options: {},
							jsonBody:
								'={\n  "model": "wan/2-6-video-to-video",\n    "input": {\n      "prompt": "{{ $json.prompt }}",\n      "video_urls": [\n        "{{ $json.video_urls }}"\n      ],\n      "duration": "{{ $json.duration }}",\n      "resolution": "{{ $json.resolution }}",\n      "multi_shots": false\n    }\n}',
							sendBody: true,
							specifyBody: 'json',
							authentication: 'genericCredentialType',
							genericAuthType: 'httpBearerAuth',
						},
						credentials: { httpBearerAuth: { id: 'vX52jw1dTyyouVZr', name: 'KIA.AI' } },
						position: [1632, 1696],
						name: 'Submit Video Generation',
					},
				}),
				node({
					type: 'n8n-nodes-base.code',
					version: 2,
					config: {
						parameters: {
							jsCode:
								"// n8n Function node\nconst items = $input.all();\nconst out = [];\n\nfor (const item of items) {\n  // Your HTTP node sometimes returns an array at top-level\n  const payload = item.json;\n  const first = Array.isArray(payload) ? payload[0] : payload;\n\n  // Get the stringified resultJson safely\n  const resultJsonStr = first?.data?.resultJson ?? '';\n\n  // Parse and extract\n  let resultUrls = [];\n  try {\n    const parsed = JSON.parse(resultJsonStr);\n    resultUrls = parsed?.resultUrls ?? [];\n  } catch (e) {\n    // leave resultUrls as []\n  }\n\n  out.push({ json: { resultUrls } });\n}\n\nreturn out;\n",
						},
						position: [2496, 1664],
						name: 'Video URL',
					},
				}),
				node({
					type: 'n8n-nodes-base.wait',
					version: 1,
					config: {
						parameters: { unit: 'seconds', amount: 5 },
						position: [1872, 1696],
						name: 'Wait for Video-to-Video Generation',
					},
				}),
				node({
					type: 'n8n-nodes-base.wait',
					version: 1,
					config: {
						parameters: { unit: 'seconds', amount: 5 },
						position: [1872, 1696],
						name: 'Wait for Video-to-Video Generation',
					},
				}),
				node({
					type: 'n8n-nodes-base.wait',
					version: 1,
					config: {
						parameters: { unit: 'seconds', amount: 5 },
						position: [1872, 1696],
						name: 'Wait for Video-to-Video Generation',
					},
				}),
			],
			{
				version: 3.2,
				parameters: {
					rules: {
						values: [
							{
								outputKey: 'fail',
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
											id: 'fail-state-condition',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{ $json.data.state }}',
											rightValue: 'fail',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'success',
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
											id: 'success-state-condition',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{ $json.data.state }}',
											rightValue: 'success',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'generating',
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
											id: 'generating-state-condition',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{ $json.data.state }}',
											rightValue: 'generating',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'queuing',
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
											id: 'queuing-state-condition',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{ $json.data.state }}',
											rightValue: 'queuing',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'waiting',
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
											id: 'waiting-state-condition',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{ $json.data.state }}',
											rightValue: 'waiting',
										},
									],
								},
								renameOutput: true,
							},
						],
					},
					options: {},
				},
				name: 'Switch Video Generation',
			},
		),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.3,
			config: {
				parameters: { url: '={{ $json.resultUrls[0] }}', options: {} },
				position: [2672, 1664],
				name: 'Download Video',
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
								id: '774ed91a-11bd-4584-ad9c-418e9caf88df',
								name: 'prompt',
								type: 'string',
								value: '=YOUR_VIDEO_PROMPT_DESCRIPTION',
							},
							{
								id: 'f810bb1e-e54d-4fc8-9be7-72426902de3f',
								name: 'duration',
								type: 'string',
								value: '=5',
							},
							{
								id: '698c7fb7-c7e2-41d5-8d06-f5114d4a55d2',
								name: 'resolution',
								type: 'string',
								value: '=720p',
							},
							{
								id: 'eac7bc3a-db33-4a87-b073-c6cb7a67ac5f',
								name: 'image_url',
								type: 'string',
								value: '=YOUR_IMAGE_URL',
							},
						],
					},
				},
				position: [1424, 1104],
				name: 'Set Prompt & Image Url',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.kie.ai/api/v1/jobs/createTask',
					method: 'POST',
					options: {},
					jsonBody:
						'={\n  "model": "wan/2-6-image-to-video",\n    "input": {\n      "prompt": "{{ $json.prompt }}",\n      "image_urls": [\n        "{{ $json.image_url }}"\n      ],\n      "duration": "{{ $json.duration }}",\n      "resolution": "{{ $json.resolution }}",\n      "multi_shots": false\n    }\n}',
					sendBody: true,
					specifyBody: 'json',
					authentication: 'genericCredentialType',
					genericAuthType: 'httpBearerAuth',
				},
				credentials: { httpBearerAuth: { id: 'vX52jw1dTyyouVZr', name: 'KIA.AI' } },
				position: [1648, 1104],
				name: 'Submit Video Generation a',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.wait',
			version: 1,
			config: {
				parameters: { unit: 'seconds', amount: 5 },
				position: [1872, 1104],
				name: 'Wait for Image-to-Video Generation',
			},
		}),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.2,
			config: {
				parameters: {
					url: 'https://api.kie.ai/api/v1/jobs/recordInfo',
					options: {},
					sendQuery: true,
					authentication: 'genericCredentialType',
					genericAuthType: 'httpBearerAuth',
					queryParameters: {
						parameters: [{ name: 'taskId', value: '={{ $json.data.taskId }}' }],
					},
				},
				credentials: { httpBearerAuth: { id: 'vX52jw1dTyyouVZr', name: 'KIA.AI' } },
				position: [2032, 1104],
				name: 'Check Video Status',
			},
		}),
	)
	.then(
		switchCase(
			[
				node({
					type: 'n8n-nodes-base.httpRequest',
					version: 4.2,
					config: {
						parameters: {
							url: 'https://api.kie.ai/api/v1/jobs/createTask',
							method: 'POST',
							options: {},
							jsonBody:
								'={\n  "model": "wan/2-6-image-to-video",\n    "input": {\n      "prompt": "{{ $json.prompt }}",\n      "image_urls": [\n        "{{ $json.image_url }}"\n      ],\n      "duration": "{{ $json.duration }}",\n      "resolution": "{{ $json.resolution }}",\n      "multi_shots": false\n    }\n}',
							sendBody: true,
							specifyBody: 'json',
							authentication: 'genericCredentialType',
							genericAuthType: 'httpBearerAuth',
						},
						credentials: { httpBearerAuth: { id: 'vX52jw1dTyyouVZr', name: 'KIA.AI' } },
						position: [1648, 1104],
						name: 'Submit Video Generation a',
					},
				}),
				node({
					type: 'n8n-nodes-base.code',
					version: 2,
					config: {
						parameters: {
							jsCode:
								"// n8n Function node\nconst items = $input.all();\nconst out = [];\n\nfor (const item of items) {\n  // Your HTTP node sometimes returns an array at top-level\n  const payload = item.json;\n  const first = Array.isArray(payload) ? payload[0] : payload;\n\n  // Get the stringified resultJson safely\n  const resultJsonStr = first?.data?.resultJson ?? '';\n\n  // Parse and extract\n  let resultUrls = [];\n  try {\n    const parsed = JSON.parse(resultJsonStr);\n    resultUrls = parsed?.resultUrls ?? [];\n  } catch (e) {\n    // leave resultUrls as []\n  }\n\n  out.push({ json: { resultUrls } });\n}\n\nreturn out;\n",
						},
						position: [2480, 1072],
						name: 'Video URL1',
					},
				}),
				node({
					type: 'n8n-nodes-base.wait',
					version: 1,
					config: {
						parameters: { unit: 'seconds', amount: 5 },
						position: [1872, 1104],
						name: 'Wait for Image-to-Video Generation',
					},
				}),
				node({
					type: 'n8n-nodes-base.wait',
					version: 1,
					config: {
						parameters: { unit: 'seconds', amount: 5 },
						position: [1872, 1104],
						name: 'Wait for Image-to-Video Generation',
					},
				}),
				node({
					type: 'n8n-nodes-base.wait',
					version: 1,
					config: {
						parameters: { unit: 'seconds', amount: 5 },
						position: [1872, 1104],
						name: 'Wait for Image-to-Video Generation',
					},
				}),
			],
			{
				version: 3.2,
				parameters: {
					rules: {
						values: [
							{
								outputKey: 'fail',
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
											id: 'fail-state-condition',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{ $json.data.state }}',
											rightValue: 'fail',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'success',
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
											id: 'success-state-condition',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{ $json.data.state }}',
											rightValue: 'success',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'generating',
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
											id: 'generating-state-condition',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{ $json.data.state }}',
											rightValue: 'generating',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'queuing',
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
											id: 'queuing-state-condition',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{ $json.data.state }}',
											rightValue: 'queuing',
										},
									],
								},
								renameOutput: true,
							},
							{
								outputKey: 'waiting',
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
											id: 'waiting-state-condition',
											operator: {
												name: 'filter.operator.equals',
												type: 'string',
												operation: 'equals',
											},
											leftValue: '={{ $json.data.state }}',
											rightValue: 'waiting',
										},
									],
								},
								renameOutput: true,
							},
						],
					},
					options: {},
				},
				name: 'Switch Image-to-Video Status',
			},
		),
	)
	.then(
		node({
			type: 'n8n-nodes-base.httpRequest',
			version: 4.3,
			config: {
				parameters: { url: '={{ $json.resultUrls[0] }}', options: {} },
				position: [2640, 1072],
				name: 'Download Video1',
			},
		}),
	)
	.add(
		sticky(
			"## Muhammad Farooq Iqbal - Automation Expert & n8n Creator\n\nI am a passionate automation expert and recognized n8n Creator specializing in intelligent workflow automation. With extensive experience in n8n, AI automation, Zapier, and Make.com, I have created innovative workflow templates with 2500+ downloads across the global automation community\n\n### Expertise\n- **Workflow Automation**: n8n, Zapier, Make.com, AI automation\n- **AI Integration**: Gemini AI, API integration, data processing\n- **Platform Mastery**: Google Sheets, Google Drive, custom scripts\n\n## Need Help with This Workflow?\n\nIf you face any issues with this workflow or need customization support, feel free to reach out:\n\n**📧 Email**: mfarooqiqbal143@gmail.com  \n**📱 Phone**: +923036991118  \n**💼 LinkedIn**: [Connect with me](https://linkedin.com/in/muhammadfarooqiqbal)  \n**🌐 Portfolio**: [View my work](https://mfarooqone.github.io/n8n/)\n**UpWork**: [Upwork Profile](https://www.upwork.com/freelancers/~011aeba159896e2eba)\n\n*I'm always excited to help with automation challenges and workflow optimization!*\n",
			{ name: 'Sticky Note7', color: 5, position: [528, 928], width: 528, height: 640 },
		),
	)
	.add(
		sticky(
			'**Text-to-Video Workflow**\n\nGenerates videos from text prompts using WAN 2.6. Set your parameters, submit the request, and the workflow polls for completion before downloading.',
			{ name: 'Text-to-Video Section', position: [1104, 368], width: 1728, height: 512 },
		),
	)
	.add(
		sticky(
			'**Video-to-Video Workflow**\n\nTransforms existing videos using WAN 2.6. Provide a video URL and prompt, then the workflow handles generation and download.',
			{ name: 'Video-to-Video Section', position: [1104, 1488], width: 1728, height: 512 },
		),
	)
	.add(
		sticky(
			'**Image-to-Video Workflow**\n\nAnimates existing images into videos using WAN 2.6. Provide an image URL and prompt, then the workflow handles generation and download.',
			{ name: 'Image-to-Video Section', position: [1104, 928], width: 1728, height: 512 },
		),
	)
	.add(
		sticky(
			"## How it works\n\nThis workflow generates videos using WAN 2.6 AI through the KIE.AI API. You can create videos three ways: text-to-video (from descriptions), image-to-video (animate images), or video-to-video (transform existing videos). Each workflow submits your request, waits for processing (typically 1-5 minutes), checks status every 5 seconds, and downloads the completed video when ready.\n\n## Setup steps\n\n1. Get your KIE.AI API key from https://kie.ai/\n2. In n8n, create an HTTP Bearer Auth credential named \"KIE.AI\" and paste your API key\n3. Choose your workflow type and update the corresponding 'Set' node:\n   - Text-to-Video: Update 'Set Video Parameters' (prompt, duration: 5/10/15s, resolution: 720p/1080p)\n   - Image-to-Video: Update 'Set Prompt & Image Url' (prompt, image_url, duration, resolution)\n   - Video-to-Video: Update 'Set Video URL and Prompt' (prompt, video_urls, duration, resolution)\n4. Click \"Execute Workflow\" to test. The workflow automatically polls for completion and downloads your video.\n",
			{ name: 'Sticky Note10', position: [416, 368], width: 640, height: 512 },
		),
	);
