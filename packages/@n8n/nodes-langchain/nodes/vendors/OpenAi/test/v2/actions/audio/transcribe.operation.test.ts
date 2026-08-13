import type { IExecuteFunctions, INode } from 'n8n-workflow';
import type { Mock, Mocked } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import * as binaryDataHelpers from '../../../../helpers/binary-data';
import * as transport from '../../../../transport';
import { execute } from '../../../../v2/actions/audio/transcribe.operation';

vi.mock('../../../../helpers/binary-data');
vi.mock('../../../../transport');

const { mockFormDataAppend, mockFormDataGetHeaders, lastFormDataInstance } = vi.hoisted(() => ({
	mockFormDataAppend: vi.fn(),
	mockFormDataGetHeaders: vi.fn(),
	lastFormDataInstance: { current: null as unknown },
}));

vi.mock('form-data', () => {
	class MockFormData {
		constructor() {
			lastFormDataInstance.current = this;
		}
		append = mockFormDataAppend;
		getHeaders = mockFormDataGetHeaders;
	}
	return { default: MockFormData };
});

describe('Audio Transcribe Operation', () => {
	let mockExecuteFunctions: Mocked<IExecuteFunctions>;
	let mockNode: INode;
	const apiRequestSpy = vi.spyOn(transport, 'apiRequest');
	const getBinaryDataFileSpy = vi.spyOn(binaryDataHelpers, 'getBinaryDataFile');

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
		mockExecuteFunctions.helpers.binaryToBuffer = vi.fn();
		mockFormDataGetHeaders.mockReturnValue({ 'content-type': 'multipart/form-data' });
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it('should convert binary file content to buffer before appending to FormData', async () => {
		mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
			const params = {
				binaryPropertyName: 'data',
				options: {},
			};
			return params[paramName as keyof typeof params];
		});

		const mockBinaryFile = {
			fileContent: Buffer.from('mock-audio-data'),
			contentType: 'audio/mpeg',
			filename: 'audio.mp3',
		};
		const mockBuffer = Buffer.from('mock-audio-data');
		const mockApiResponse = { text: 'Hello world' };

		getBinaryDataFileSpy.mockResolvedValue(mockBinaryFile);
		(mockExecuteFunctions.helpers.binaryToBuffer as Mock).mockResolvedValue(mockBuffer);
		apiRequestSpy.mockResolvedValue(mockApiResponse);

		await execute.call(mockExecuteFunctions, 0);

		expect(mockExecuteFunctions.helpers.binaryToBuffer).toHaveBeenCalledWith(
			mockBinaryFile.fileContent,
		);
		expect(mockFormDataAppend).toHaveBeenCalledWith('file', mockBuffer, {
			filename: 'audio.mp3',
			contentType: 'audio/mpeg',
		});
	});

	it('should transcribe audio with basic parameters', async () => {
		mockExecuteFunctions.getNodeParameter.mockImplementation((paramName: string) => {
			const params = {
				binaryPropertyName: 'data',
				options: {},
			};
			return params[paramName as keyof typeof params];
		});

		const mockBinaryFile = {
			fileContent: Buffer.from('mock-audio-data'),
			contentType: 'audio/mpeg',
			filename: 'audio.mp3',
		};
		const mockApiResponse = { text: 'Hello world' };

		getBinaryDataFileSpy.mockResolvedValue(mockBinaryFile);
		(mockExecuteFunctions.helpers.binaryToBuffer as Mock).mockResolvedValue(
			mockBinaryFile.fileContent,
		);
		apiRequestSpy.mockResolvedValue(mockApiResponse);

		const result = await execute.call(mockExecuteFunctions, 0);
		const mockFormDataInstance = lastFormDataInstance.current;

		expect(mockFormDataAppend).toHaveBeenCalledWith('model', 'whisper-1');
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
			const params = {
				binaryPropertyName: 'data',
				options: {
					language: 'en',
					temperature: 0.5,
				},
			};
			return params[paramName as keyof typeof params];
		});

		const mockBinaryFile = {
			fileContent: Buffer.from('mock-audio-data'),
			contentType: 'audio/wav',
			filename: 'audio.wav',
		};

		getBinaryDataFileSpy.mockResolvedValue(mockBinaryFile);
		(mockExecuteFunctions.helpers.binaryToBuffer as Mock).mockResolvedValue(
			mockBinaryFile.fileContent,
		);
		apiRequestSpy.mockResolvedValue({ text: 'Transcribed text' });

		await execute.call(mockExecuteFunctions, 0);

		expect(mockFormDataAppend).toHaveBeenCalledWith('language', 'en');
		expect(mockFormDataAppend).toHaveBeenCalledWith('temperature', '0.5');
	});
});
