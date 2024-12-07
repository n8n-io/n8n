import {
	INodeType,
	INodeTypeDescription,
	INodeExecutionData,
	IExecuteFunctions,
	NodeApiError,
} from 'n8n-workflow';
import { exec } from 'child_process';
import * as path from 'path';
import * as util from 'util';
import * as fs from 'fs';

const execPromise = util.promisify(exec);

export class DrawMatrix implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Draw Matrix',
		name: 'drawMatrix',
		group: ['transform'],
		version: 1,
		description: 'Draw matrix to visualize data',
		defaults: {
			name: 'Draw Matrix',
		},
		inputs: '={{["main"]}}',
		outputs: '={{["main"]}}',
		properties: [
			{
				displayName: 'Target Column',
				name: 'targetColumn',
				type: 'string',
				default: 'target',
				description: 'The name of the target column for RFE',
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: 'target',
				description: 'The title of the matrix',
			},
			{
				displayName: 'Type Of Matrix',
				name: 'typeofmatrix',
				type: 'options',
				options: [
					{
						name: 'Bar',
						value: 'bar',
					},
					{
						name: 'Box',
						value: 'box',
					},
					{
						name: 'Heatmap',
						value: 'heatmap',
					},
					{
						name: 'Line',
						value: 'line',
					},
					{
						name: 'Pie',
						value: 'pie',
					},
					{
						name: 'Scatter',
						value: 'scatter',
					},
				],
				default: 'bar',
				description: 'Choose the type of matrix to draw',
			},
			{
				displayName: 'Output Image Path',
				name: 'outputImagePath',
				type: 'string',
				default: '/tmp/matrix_plot.png',
				description: 'The path to save the generated matrix plot image',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const targetColumn = this.getNodeParameter('targetColumn', 0) as string;
		const title = this.getNodeParameter('title', 0) as string;
		const typeOfMatrix = this.getNodeParameter('typeofmatrix', 0) as string;
		const outputImagePath = this.getNodeParameter('outputImagePath', 0) as string;

		const data = items[0].json; // Assuming the input data is JSON

		const returnData: INodeExecutionData[] = [];
		let outputData: INodeExecutionData[] = [];

		// Ensure the output directory exists
		const outputDir = path.dirname(outputImagePath);
		if (!fs.existsSync(outputDir)) {
			fs.mkdirSync(outputDir, { recursive: true });
		}

		// Call Python script to generate the plot and save it to the specified path
		try {
			// Ensure correct path handling
			const pythonScriptPath = path.join(__dirname, '../draw_matrix_script.py');

			// Execute Python script with parameters
			const { stderr } = await execPromise(
				`python "${pythonScriptPath}" "${JSON.stringify(
					data,
				)}" "${targetColumn}" "${title}" "${typeOfMatrix}" "${outputImagePath}"`,
			);

			if (stderr) {
				throw new NodeApiError(this.getNode(), { message: stderr });
			}

			// Return the path of the generated image file as output
			outputData = [
				{
					json: {
						imagePath: outputImagePath, // Return the path of the saved image
					},
				},
			];
		} catch (error) {
			returnData.push({
				json: {
					error: error.message || 'Error executing draw script',
				},
			});
		}

		return outputData.length ? [outputData] : [returnData];
	}
}
