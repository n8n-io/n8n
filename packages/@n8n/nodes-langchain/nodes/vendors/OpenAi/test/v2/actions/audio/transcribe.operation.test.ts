import FormData from 'form-data';
import { mock, mockDeep } from 'jest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';

import * as binaryDataHelpers from '../../../../helpers/binary-data';
import * as transport from '../../../../transport';
import { execute } from '../../../../v2/actions/audio/transcribe.operation';

jest.mock('../../../../helpers/binary-data');
jest.mock('../../../../transport');
jest.mock('form-data', () => jest.fn());

const mockFormData = jest.mocked(FormData);

describe('Audio Transcribe Operation', () => {
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;
	let mockNode: INode;
	let mockFormDataInstance: jest.Mocked<FormData>;
	const apiRequestSpy = jest.spyOn(transport, 'apiRequest');
	const getBinaryDataFileSpy = jest.spyOn(binaryDataHelpers, 'getBinaryDataFile');

	beforeEach(() => {
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		mockNode = mock<INode>({
			id: 'test-node',
			name: 'OpenAI Audio Transcribe',
			type: 'n8n-nodes-base.openAi',
			typeVersion: 2,
			position: [0, 0],
			parameters: {},
		});

		mockExecuteFunctions.getNode.mockReturnValue(mockNode);
		mockExecuteFunctions.helpers.binaryToBuffer = jest.fn();

		mockFormDataInstance = {
			append: jest.fn(),
			getHeaders: jest.fn().mockReturnValue({ 'content-type': 'multipart/form-data' }),
		} as unknown as jest.Mocked<FormData>;
		mockFormData.mockImplementation(() => mockFormDataInstance);
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	it('should convert binary file content to buffer before appending to FormData', async () => {
		mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
			const params: Record<string, unknown> = {
				binaryPropertyName: 'data',
				options: {},
			};
			return params[paramName];
		});

		const mockBinaryFile = {
			fileContent: Buffer.from('mock-audio-data'),
			contentType: 'audio/mpeg',
			filename: 'audio.mp3',
		};
		const mockBuffer = Buffer.from('mock-audio-data');

		const mockApiResponse = { text: 'Hello world' };

		getBinaryDataFileSpy.mockResolvedValue(mockBinaryFile);
		(mockExecuteFunctions.helpers.binaryToBuffer as jest.Mock).mockResolvedValue(mockBuffer);
		apiRequestSpy.mockResolvedValue(mockApiResponse);

		await execute.call(mockExecuteFunctions, 0);

		expect(mockExecuteFunctions.helpers.binaryToBuffer).toHaveBeenCalledWith(
			mockBinaryFile.fileContent,
		);
		expect(mockFormDataInstance.append).toHaveBeenCalledWith('file', mockBuffer, {
			filename: 'audio.mp3',
			contentType: 'audio/mpeg',
		});
	});

	it('should transcribe audio with basic parameters', async () => {
		mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
			const params: Record<string, unknown> = {
				binaryPropertyName: 'data',
				options: {},
			};
			return params[paramName];
		});

		const mockBinaryFile = {
			fileContent: Buffer.from('mock-audio-data'),
			contentType: 'audio/mpeg',
			filename: 'audio.mp3',
		};

		const mockApiResponse = { text: 'Hello world' };

		getBinaryDataFileSpy.mockResolvedValue(mockBinaryFile);
		(mockExecuteFunctions.helpers.binaryToBuffer as jest.Mock).mockResolvedValue(
			mockBinaryFile.fileContent,
		);
		apiRequestSpy.mockResolvedValue(mockApiResponse);

		const result = await execute.call(mockExecuteFunctions, 0);

		expect(mockFormDataInstance.append).toHaveBeenCalledWith('model', 'whisper-1');
		expect(apiRequestSpy).toHaveBeenCalledWith('POST', '/audio/transcriptions', {
			option: { formData: mockFormDataInstance },
			headers: { 'content-type': 'multipart/form-data' },
		});

		expect(result).toEqual([
			{
				json: mockApiResponse,
				pairedItem: { item: 0 },
			},
		]);
	});

	it('should include language and temperature options when provided', async () => {
		mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
			const params: Record<string, unknown> = {
				binaryPropertyName: 'data',
				options: {
					language: 'en',
					temperature: 0.5,
				},
			};
			return params[paramName];
		});

		const mockBinaryFile = {
			fileContent: Buffer.from('mock-audio-data'),
			contentType: 'audio/wav',
			filename: 'audio.wav',
		};

		getBinaryDataFileSpy.mockResolvedValue(mockBinaryFile);
		(mockExecuteFunctions.helpers.binaryToBuffer as jest.Mock).mockResolvedValue(
			mockBinaryFile.fileContent,
		);
		apiRequestSpy.mockResolvedValue({ text: 'Transcribed text' });

		await execute.call(mockExecuteFunctions, 0);

		expect(mockFormDataInstance.append).toHaveBeenCalledWith('language', 'en');
		expect(mockFormDataInstance.append).toHaveBeenCalledWith('temperature', '0.5');
	});
});
