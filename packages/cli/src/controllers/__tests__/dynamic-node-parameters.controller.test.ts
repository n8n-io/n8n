import { DynamicNodeParametersController } from '@/controllers/dynamicNodeParameters.controller';
import type { DynamicNodeParametersRequest } from '@/requests';
import type { DynamicNodeParametersService } from '@/services/dynamicNodeParameters.service';
import { mock } from 'jest-mock-extended';
import * as AdditionalData from '@/WorkflowExecuteAdditionalData';
import type { ILoadOptions, IWorkflowExecuteAdditionalData } from 'n8n-workflow';

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
