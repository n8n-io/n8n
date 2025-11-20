import { HumanMessage } from '@langchain/core/messages';
import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';

import { extractBinaryMessages } from '../../agents/ToolsAgent/common';

describe('extractBinaryMessages', () => {
	it('should extract image messages', async () => {
		const mockContext = mock<IExecuteFunctions>();
		const binaryData = {
			image: {
				mimeType: 'image/png',
				fileExtension: 'png',
				fileName: 'test.png',
				data: 'imageDataContent',
			},
		};

		mockContext.getInputData.mockReturnValue([{ json: {}, binary: binaryData }]);

		const result = await extractBinaryMessages(mockContext, 0);

		expect(result).toBeInstanceOf(HumanMessage);
		expect(result.content).toHaveLength(1);
		expect(result.content[0]).toEqual({
			type: 'image_url',
			image_url: {
				url: 'data:image/png;base64,imageDataContent',
			},
		});
	});

	it('should extract markdown and CSV files', async () => {
		const mockContext = mock<IExecuteFunctions>();
		const mdContent = '# Test Markdown\n\nThis is a test.';
		const csvContent = 'name,age\nJohn,30';
		const binaryData = {
			markdown: {
				mimeType: 'text/markdown',
				fileExtension: 'md',
				fileName: 'test.md',
				data: `data:text/markdown;base64,${Buffer.from(mdContent).toString('base64')}`,
			},
			csv: {
				mimeType: 'text/csv',
				fileExtension: 'csv',
				fileName: 'data.csv',
				data: `data:text/csv;base64,${Buffer.from(csvContent).toString('base64')}`,
			},
		};

		mockContext.getInputData.mockReturnValue([{ json: {}, binary: binaryData }]);

		const result = await extractBinaryMessages(mockContext, 0);

		expect(result).toBeInstanceOf(HumanMessage);
		expect(result.content).toHaveLength(2);
		expect(result.content).toEqual(
			expect.arrayContaining([
				{ type: 'text', text: `File: test.md\nContent:\n${mdContent}` },
				{ type: 'text', text: `File: data.csv\nContent:\n${csvContent}` },
			]),
		);
	});

	it('should extract both images and text files', async () => {
		const mockContext = mock<IExecuteFunctions>();
		const textContent = 'Some text content';
		const binaryData = {
			image: {
				mimeType: 'image/png',
				fileExtension: 'png',
				fileName: 'test.png',
				data: 'imageData123',
			},
			text: {
				mimeType: 'text/plain',
				fileExtension: 'txt',
				fileName: 'test.txt',
				data: `data:text/plain;base64,${Buffer.from(textContent).toString('base64')}`,
			},
		};

		mockContext.getInputData.mockReturnValue([{ json: {}, binary: binaryData }]);

		const result = await extractBinaryMessages(mockContext, 0);

		expect(result).toBeInstanceOf(HumanMessage);
		expect(result.content).toHaveLength(2);
		expect(result.content).toEqual(
			expect.arrayContaining([
				{
					type: 'image_url',
					image_url: { url: 'data:image/png;base64,imageData123' },
				},
				{ type: 'text', text: `File: test.txt\nContent:\n${textContent}` },
			]),
		);
	});

	it('should ignore unsupported file types', async () => {
		const mockContext = mock<IExecuteFunctions>();
		const binaryData = {
			pdf: {
				mimeType: 'application/pdf',
				fileExtension: 'pdf',
				fileName: 'test.pdf',
				data: 'pdfDataContent',
			},
			video: {
				mimeType: 'video/mp4',
				fileExtension: 'mp4',
				fileName: 'test.mp4',
				data: 'videoData',
			},
		};

		mockContext.getInputData.mockReturnValue([{ json: {}, binary: binaryData }]);

		const result = await extractBinaryMessages(mockContext, 0);

		expect(result).toBeInstanceOf(HumanMessage);
		expect(result.content).toHaveLength(0);
	});
});
