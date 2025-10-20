// import { doIt } from './worker-thread';
//
// // eslint-disable-next-line @typescript-eslint/no-floating-promises
// (async function main() {
// 	const result = await doIt({
// 		id: '1',
// 		name: 'foo',
// 		createdAt: new Date(),
// 		updatedAt: new Date(),
// 		active: true,
// 		nodes: [
// 			{
// 				parameters: {
// 					rule: {
// 						interval: [{}],
// 					},
// 				},
// 				type: 'n8n-nodes-base.scheduleTrigger',
// 				typeVersion: 1.2,
// 				position: [0, 0],
// 				id: 'b4575379-6e80-4c75-a257-b9508588adda',
// 				name: 'Schedule Trigger',
// 			},
// 			{
// 				parameters: {},
// 				type: 'n8n-nodes-base.noOp',
// 				typeVersion: 1,
// 				position: [220, 0],
// 				id: 'a8ff0ebe-b2bb-4acc-8932-7dad6aa1ce40',
// 				name: 'No Operation, do nothing',
// 			},
// 			{
// 				parameters: {
// 					assignments: {
// 						assignments: [
// 							{
// 								id: '712e387a-806c-46df-a4fd-e3214f4634ec',
// 								name: 'foo',
// 								value: 'bar',
// 								type: 'string',
// 							},
// 						],
// 					},
// 					options: {},
// 				},
// 				type: 'n8n-nodes-base.set',
// 				typeVersion: 3.4,
// 				position: [440, 0],
// 				id: '8b6eb7c4-0ff6-4bbc-a0ae-b1bd26d76629',
// 				name: 'Edit Fields',
// 			},
// 		],
// 		connections: {
// 			'Schedule Trigger': {
// 				main: [
// 					[
// 						{
// 							node: 'No Operation, do nothing',
// 							type: 'main',
// 							index: 0,
// 						},
// 					],
// 				],
// 			},
// 			'No Operation, do nothing': {
// 				main: [
// 					[
// 						{
// 							node: 'Edit Fields',
// 							type: 'main',
// 							index: 0,
// 						},
// 					],
// 				],
// 			},
// 		},
// 		pinData: {},
// 		meta: {
// 			instanceId: '86a14959bc0356d0c48aa1c469bc640084520ce98f41610f78c22fbb6ab12409',
// 		},
// 	});
//
// 	console.log('start', result);
// })();
