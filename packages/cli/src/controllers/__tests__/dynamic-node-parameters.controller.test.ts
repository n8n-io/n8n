import { mock } from 'jest-mock-extended';
import type { ILoadOptions, IWorkflowExecuteAdditionalData } from 'n8n-workflow';

import { DynamicNodeParametersController } from '@/controllers/dynamic-node-parameters.controller';
import type { DynamicNodeParametersRequest } from '@/requests';
import type { DynamicNodeParametersService } from '@/services/dynamic-node-parameters.service';
import * as AdditionalData from '@/workflow-execute-additional-data';

describe('DynamicNodeParametersController', () => {
	const service = mock<DynamicNodeParametersService>();
	const controller = new DynamicNodeParametersController(service);

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('getOptions', () => {
		it('should take `loadOptions` as object', async () => {
			jest
				.spyOn(AdditionalData, 'getBase')
				.mockResolvedValue(mock<IWorkflowExecuteAdditionalData>());

			const req = mock<DynamicNodeParametersRequest.Options>();
			const loadOptions: ILoadOptions = {};
			req.body.loadOptions = loadOptions;

			await controller.getOptions(req);

			const zerothArg = service.getOptionsViaLoadOptions.mock.calls[0][0];

			expect(zerothArg).toEqual(loadOptions);
		});
	});
});
