import { DynamicNodeParametersController } from '@/controllers/dynamicNodeParameters.controller';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import type { DynamicNodeParametersRequest } from '@/requests';
import type { DynamicNodeParametersService } from '@/services/dynamicNodeParameters.service';
import { mock } from 'jest-mock-extended';
import type { INode } from 'n8n-workflow';
import {
	NodeOperationError,
	type INodeCredentials,
	type INodeParameters,
	type INodeTypeNameVersion,
} from 'n8n-workflow';
import { mockInstance } from '../../shared/mocking';
import { CredentialsHelper } from '@/CredentialsHelper';
import { SecretsHelper } from '@/SecretsHelpers';
import { MessageEventBus } from '@/eventbus/MessageEventBus/MessageEventBus';
import { VariablesService } from '@/environments/variables/variables.service.ee';

describe('DynamicNodeParametersController', () => {
	mockInstance(CredentialsHelper);
	mockInstance(SecretsHelper);
	mockInstance(MessageEventBus);
	mockInstance(VariablesService, {
		getAllCached: async () => [],
	});

	const service = mock<DynamicNodeParametersService>();
	const controller = new DynamicNodeParametersController(service);

	describe('getResourceLocatorResults', () => {
		it('should call the service method with the correct parameters', async () => {
			// Arrange
			const mockCredentials = mock<INodeCredentials>();
			const mockNodeParams = mock<INodeParameters>();
			const mockNodeTypeAndVersion = mock<INodeTypeNameVersion>();

			const req = mock<DynamicNodeParametersRequest.ResourceLocatorResults>({
				query: {
					methodName: 'testMethodName',
					path: 'testPath',
					filter: 'testFilter',
					paginationToken: 'testPaginationToken',
				},
				params: {
					nodeTypeAndVersion: mockNodeTypeAndVersion,
					currentNodeParameters: mockNodeParams,
					credentials: mockCredentials,
				},
				user: {
					id: 'testUserId',
				},
			});

			// Act
			await controller.getResourceLocatorResults(req);

			// Assert
			expect(service.getResourceLocatorResults).toHaveBeenCalledWith(
				'testMethodName',
				'testPath',
				expect.anything(),
				mockNodeTypeAndVersion,
				mockNodeParams,
				mockCredentials,
				'testFilter',
				'testPaginationToken',
			);
		});

		it('should throw BadRequestError if service throws NodeOperationError', async () => {
			// Arrange
			const req = mock<DynamicNodeParametersRequest.ResourceLocatorResults>({
				user: {
					id: 'testUserId',
				},
			});
			service.getResourceLocatorResults.mockRejectedValue(
				new NodeOperationError(mock<INode>(), 'test error'),
			);

			// Act & Assert
			await expect(async () => await controller.getResourceLocatorResults(req)).rejects.toThrow(
				new BadRequestError('test error'),
			);
		});
	});
});
