import { mock } from 'jest-mock-extended';
import type { IExecuteFunctions } from 'n8n-workflow';

import {
	createDatapoint,
	getAllDatapoints,
	updateDatapoint,
	deleteDatapoint,
	createCharge,
	uncleGoal,
	createAllDatapoints,
	getSingleDatapoint,
	getGoal,
	getAllGoals,
	getArchivedGoals,
	createGoal,
	updateGoal,
	refreshGoal,
	shortCircuitGoal,
	stepDownGoal,
	cancelStepDownGoal,
	getUser,
	type Datapoint,
} from '../Beeminder.node.functions';
import * as GenericFunctions from '../GenericFunctions';

// Mock the GenericFunctions
jest.mock('../GenericFunctions');
const mockedGenericFunctions = jest.mocked(GenericFunctions);

describe('Beeminder Node Functions', () => {
	let mockContext: IExecuteFunctions;

	beforeEach(() => {
		mockContext = mock<IExecuteFunctions>();
		jest.clearAllMocks();
	});

	describe('Datapoint Operations', () => {
		describe('createDatapoint', () => {
			it('should create a datapoint with required parameters', async () => {
				const mockResponse = { id: '123', value: 10, timestamp: 1234567890 };
				mockedGenericFunctions.beeminderApiRequest.mockResolvedValue(mockResponse);

				const data = {
					goalName: 'testgoal',
					value: 10,
				};

				const result = await createDatapoint.call(mockContext, data);

				expect(mockedGenericFunctions.beeminderApiRequest).toHaveBeenCalledWith(
					'POST',
					'/users/me/goals/testgoal/datapoints.json',
					data,
					{},
				);
				expect(result).toBe(mockResponse);
			});

			it('should create a datapoint with all optional parameters', async () => {
				const mockResponse = { id: '123', value: 10, timestamp: 1234567890 };
				mockedGenericFunctions.beeminderApiRequest.mockResolvedValue(mockResponse);

				const data = {
					goalName: 'testgoal',
					value: 10,
					timestamp: 1234567890,
					comment: 'Test comment',
					requestid: 'req123',
				};

				const result = await createDatapoint.call(mockContext, data);

				expect(mockedGenericFunctions.beeminderApiRequest).toHaveBeenCalledWith(
					'POST',
					'/users/me/goals/testgoal/datapoints.json',
					data,
					{},
				);
				expect(result).toBe(mockResponse);
			});
		});

		describe('getAllDatapoints', () => {
			it('should get all datapoints when count is not specified', async () => {
				const mockResponse = [{ id: '1' }, { id: '2' }];
				mockedGenericFunctions.beeminderApiRequestAllItems.mockResolvedValue(mockResponse);

				const data = { goalName: 'testgoal' };

				const result = await getAllDatapoints.call(mockContext, data);

				expect(mockedGenericFunctions.beeminderApiRequestAllItems).toHaveBeenCalledWith(
					'GET',
					'/users/me/goals/testgoal/datapoints.json',
					{},
					data,
				);
				expect(result).toBe(mockResponse);
			});

			it('should get limited datapoints when count is specified', async () => {
				const mockResponse = [{ id: '1' }];
				mockedGenericFunctions.beeminderApiRequest.mockResolvedValue(mockResponse);

				const data = { goalName: 'testgoal', count: 1 };

				const result = await getAllDatapoints.call(mockContext, data);

				expect(mockedGenericFunctions.beeminderApiRequest).toHaveBeenCalledWith(
					'GET',
					'/users/me/goals/testgoal/datapoints.json',
					{},
					data,
				);
				expect(result).toBe(mockResponse);
			});

			it('should handle optional parameters', async () => {
				const mockResponse = [{ id: '1' }];
				mockedGenericFunctions.beeminderApiRequest.mockResolvedValue(mockResponse);

				const data = {
					goalName: 'testgoal',
					count: 5,
					sort: 'id',
					page: 2,
					per: 10,
				};

				const result = await getAllDatapoints.call(mockContext, data);

				expect(mockedGenericFunctions.beeminderApiRequest).toHaveBeenCalledWith(
					'GET',
					'/users/me/goals/testgoal/datapoints.json',
					{},
					data,
				);
				expect(result).toBe(mockResponse);
			});
		});

		describe('updateDatapoint', () => {
			it('should update a datapoint with required parameters', async () => {
				const mockResponse = { id: '123', value: 15 };
				mockedGenericFunctions.beeminderApiRequest.mockResolvedValue(mockResponse);

				const data = {
					goalName: 'testgoal',
					datapointId: '123',
				};

				const result = await updateDatapoint.call(mockContext, data);

				expect(mockedGenericFunctions.beeminderApiRequest).toHaveBeenCalledWith(
					'PUT',
					'/users/me/goals/testgoal/datapoints/123.json',
					data,
					{},
				);
				expect(result).toBe(mockResponse);
			});

			it('should update a datapoint with all optional parameters', async () => {
				const mockResponse = { id: '123', value: 15 };
				mockedGenericFunctions.beeminderApiRequest.mockResolvedValue(mockResponse);

				const data = {
					goalName: 'testgoal',
					datapointId: '123',
					value: 15,
					comment: 'Updated comment',
					timestamp: 1234567890,
				};

				const result = await updateDatapoint.call(mockContext, data);

				expect(mockedGenericFunctions.beeminderApiRequest).toHaveBeenCalledWith(
					'PUT',
					'/users/me/goals/testgoal/datapoints/123.json',
					data,
					{},
				);
				expect(result).toBe(mockResponse);
			});
		});

		describe('deleteDatapoint', () => {
			it('should delete a datapoint', async () => {
				const mockResponse = { success: true };
				mockedGenericFunctions.beeminderApiRequest.mockResolvedValue(mockResponse);

				const data = {
					goalName: 'testgoal',
					datapointId: '123',
				};

				const result = await deleteDatapoint.call(mockContext, data);

				expect(mockedGenericFunctions.beeminderApiRequest).toHaveBeenCalledWith(
					'DELETE',
					'/users/me/goals/testgoal/datapoints/123.json',
				);
				expect(result).toBe(mockResponse);
			});
		});

		describe('createAllDatapoints', () => {
			it('should create multiple datapoints', async () => {
				const mockResponse = { created: 2 };
				mockedGenericFunctions.beeminderApiRequest.mockResolvedValue(mockResponse);

				const datapoints: Datapoint[] = [
					{ timestamp: 1234567890, value: 10, comment: 'First' },
					{ timestamp: 1234567891, value: 20, comment: 'Second' },
				];

				const data = {
					goalName: 'testgoal',
					datapoints,
				};

				const result = await createAllDatapoints.call(mockContext, data);

				expect(mockedGenericFunctions.beeminderApiRequest).toHaveBeenCalledWith(
					'POST',
					'/users/me/goals/testgoal/datapoints/create_all.json',
					{ datapoints },
					{},
				);
				expect(result).toBe(mockResponse);
			});
		});

		describe('getSingleDatapoint', () => {
			it('should get a single datapoint', async () => {
				const mockResponse = { id: '123', value: 10 };
				mockedGenericFunctions.beeminderApiRequest.mockResolvedValue(mockResponse);

				const data = {
					goalName: 'testgoal',
					datapointId: '123',
				};

				const result = await getSingleDatapoint.call(mockContext, data);

				expect(mockedGenericFunctions.beeminderApiRequest).toHaveBeenCalledWith(
					'GET',
					'/users/me/goals/testgoal/datapoints/123.json',
				);
				expect(result).toBe(mockResponse);
			});
		});
	});

	describe('Goal Operations', () => {
		describe('getGoal', () => {
			it('should get a goal with basic parameters', async () => {
				const mockResponse = { slug: 'testgoal', title: 'Test Goal' };
				mockedGenericFunctions.beeminderApiRequest.mockResolvedValue(mockResponse);

				const data = { goalName: 'testgoal' };

				const result = await getGoal.call(mockContext, data);

				expect(mockedGenericFunctions.beeminderApiRequest).toHaveBeenCalledWith(
					'GET',
					'/users/me/goals/testgoal.json',
					{},
					data,
				);
				expect(result).toBe(mockResponse);
			});

			it('should get a goal with optional parameters', async () => {
				const mockResponse = { slug: 'testgoal', title: 'Test Goal' };
				mockedGenericFunctions.beeminderApiRequest.mockResolvedValue(mockResponse);

				const data = {
					goalName: 'testgoal',
					datapoints: true,
					emaciated: false,
				};

				const result = await getGoal.call(mockContext, data);

				expect(mockedGenericFunctions.beeminderApiRequest).toHaveBeenCalledWith(
					'GET',
					'/users/me/goals/testgoal.json',
					{},
					data,
				);
				expect(result).toBe(mockResponse);
			});
		});

		describe('getAllGoals', () => {
			it('should get all goals without parameters', async () => {
				const mockResponse = [{ slug: 'goal1' }, { slug: 'goal2' }];
				mockedGenericFunctions.beeminderApiRequest.mockResolvedValue(mockResponse);

				const result = await getAllGoals.call(mockContext);

				expect(mockedGenericFunctions.beeminderApiRequest).toHaveBeenCalledWith(
					'GET',
					'/users/me/goals.json',
					{},
					{},
				);
				expect(result).toBe(mockResponse);
			});

			it('should get all goals with emaciated parameter', async () => {
				const mockResponse = [{ slug: 'goal1' }, { slug: 'goal2' }];
				mockedGenericFunctions.beeminderApiRequest.mockResolvedValue(mockResponse);

				const data = { emaciated: true };

				const result = await getAllGoals.call(mockContext, data);

				expect(mockedGenericFunctions.beeminderApiRequest).toHaveBeenCalledWith(
					'GET',
					'/users/me/goals.json',
					{},
					data,
				);
				expect(result).toBe(mockResponse);
			});
		});

		describe('getArchivedGoals', () => {
			it('should get archived goals without parameters', async () => {
				const mockResponse = [{ slug: 'archived1' }];
				mockedGenericFunctions.beeminderApiRequest.mockResolvedValue(mockResponse);

				const result = await getArchivedGoals.call(mockContext);

				expect(mockedGenericFunctions.beeminderApiRequest).toHaveBeenCalledWith(
					'GET',
					'/users/me/goals/archived.json',
					{},
					{},
				);
				expect(result).toBe(mockResponse);
			});

			it('should get archived goals with emaciated parameter', async () => {
				const mockResponse = [{ slug: 'archived1' }];
				mockedGenericFunctions.beeminderApiRequest.mockResolvedValue(mockResponse);

				const data = { emaciated: true };

				const result = await getArchivedGoals.call(mockContext, data);

				expect(mockedGenericFunctions.beeminderApiRequest).toHaveBeenCalledWith(
					'GET',
					'/users/me/goals/archived.json',
					{},
					data,
				);
				expect(result).toBe(mockResponse);
			});
		});

		describe('createGoal', () => {
			it('should create a goal with required parameters', async () => {
				const mockResponse = { slug: 'newgoal', id: 'goal123' };
				mockedGenericFunctions.beeminderApiRequest.mockResolvedValue(mockResponse);

				const data = {
					slug: 'newgoal',
					title: 'New Goal',
					goal_type: 'hustler',
					gunits: 'hours',
				};

				const result = await createGoal.call(mockContext, data);

				expect(mockedGenericFunctions.beeminderApiRequest).toHaveBeenCalledWith(
					'POST',
					'/users/me/goals.json',
					data,
					{},
				);
				expect(result).toBe(mockResponse);
			});

			it('should create a goal with all optional parameters', async () => {
				const mockResponse = { slug: 'newgoal', id: 'goal123' };
				mockedGenericFunctions.beeminderApiRequest.mockResolvedValue(mockResponse);

				const data = {
					slug: 'newgoal',
					title: 'New Goal',
					goal_type: 'hustler',
					gunits: 'hours',
					goaldate: 1234567890,
					goalval: 100,
					rate: 1,
					initval: 0,
					secret: false,
					datapublic: true,
					datasource: 'manual',
					dryrun: false,
					tags: ['productivity', 'work'],
				};

				const result = await createGoal.call(mockContext, data);

				expect(mockedGenericFunctions.beeminderApiRequest).toHaveBeenCalledWith(
					'POST',
					'/users/me/goals.json',
					data,
					{},
				);
				expect(result).toBe(mockResponse);
			});
		});

		describe('updateGoal', () => {
			it('should update a goal with goalName', async () => {
				const mockResponse = { slug: 'testgoal', title: 'Updated Title' };
				mockedGenericFunctions.beeminderApiRequest.mockResolvedValue(mockResponse);

				const data = {
					goalName: 'testgoal',
					title: 'Updated Title',
				};

				const result = await updateGoal.call(mockContext, data);

				expect(mockedGenericFunctions.beeminderApiRequest).toHaveBeenCalledWith(
					'PUT',
					'/users/me/goals/testgoal.json',
					data,
					{},
				);
				expect(result).toBe(mockResponse);
			});

			it('should update a goal with all optional parameters', async () => {
				const mockResponse = { slug: 'testgoal' };
				mockedGenericFunctions.beeminderApiRequest.mockResolvedValue(mockResponse);

				const data = {
					goalName: 'testgoal',
					title: 'Updated Title',
					yaxis: 'Hours worked',
					tmin: '08:00',
					tmax: '18:00',
					secret: true,
					datapublic: false,
					roadall: { rate: 2 },
					datasource: 'api',
					tags: ['work', 'productivity'],
				};

				const result = await updateGoal.call(mockContext, data);

				expect(mockedGenericFunctions.beeminderApiRequest).toHaveBeenCalledWith(
					'PUT',
					'/users/me/goals/testgoal.json',
					data,
					{},
				);
				expect(result).toBe(mockResponse);
			});
		});

		describe('refreshGoal', () => {
			it('should refresh a goal', async () => {
				const mockResponse = { success: true };
				mockedGenericFunctions.beeminderApiRequest.mockResolvedValue(mockResponse);

				const data = { goalName: 'testgoal' };

				const result = await refreshGoal.call(mockContext, data);

				expect(mockedGenericFunctions.beeminderApiRequest).toHaveBeenCalledWith(
					'GET',
					'/users/me/goals/testgoal/refresh_graph.json',
				);
				expect(result).toBe(mockResponse);
			});
		});

		describe('shortCircuitGoal', () => {
			it('should short circuit a goal', async () => {
				const mockResponse = { success: true };
				mockedGenericFunctions.beeminderApiRequest.mockResolvedValue(mockResponse);

				const data = { goalName: 'testgoal' };

				const result = await shortCircuitGoal.call(mockContext, data);

				expect(mockedGenericFunctions.beeminderApiRequest).toHaveBeenCalledWith(
					'POST',
					'/users/me/goals/testgoal/shortcircuit.json',
				);
				expect(result).toBe(mockResponse);
			});
		});

		describe('stepDownGoal', () => {
			it('should step down a goal', async () => {
				const mockResponse = { success: true };
				mockedGenericFunctions.beeminderApiRequest.mockResolvedValue(mockResponse);

				const data = { goalName: 'testgoal' };

				const result = await stepDownGoal.call(mockContext, data);

				expect(mockedGenericFunctions.beeminderApiRequest).toHaveBeenCalledWith(
					'POST',
					'/users/me/goals/testgoal/stepdown.json',
				);
				expect(result).toBe(mockResponse);
			});
		});

		describe('cancelStepDownGoal', () => {
			it('should cancel step down for a goal', async () => {
				const mockResponse = { success: true };
				mockedGenericFunctions.beeminderApiRequest.mockResolvedValue(mockResponse);

				const data = { goalName: 'testgoal' };

				const result = await cancelStepDownGoal.call(mockContext, data);

				expect(mockedGenericFunctions.beeminderApiRequest).toHaveBeenCalledWith(
					'POST',
					'/users/me/goals/testgoal/cancel_stepdown.json',
				);
				expect(result).toBe(mockResponse);
			});
		});
	});

	describe('Charge Operations', () => {
		describe('createCharge', () => {
			it('should create a charge with required amount', async () => {
				const mockResponse = { id: 'charge123', amount: 5 };
				mockedGenericFunctions.beeminderApiRequest.mockResolvedValue(mockResponse);

				const data = { amount: 5 };

				const result = await createCharge.call(mockContext, data);

				expect(mockedGenericFunctions.beeminderApiRequest).toHaveBeenCalledWith(
					'POST',
					'/charges.json',
					{
						user_id: 'me',
						amount: 5,
					},
					{},
				);
				expect(result).toBe(mockResponse);
			});

			it('should create a charge with all optional parameters', async () => {
				const mockResponse = { id: 'charge123', amount: 10 };
				mockedGenericFunctions.beeminderApiRequest.mockResolvedValue(mockResponse);

				const data = {
					amount: 10,
					note: 'Penalty charge',
					dryrun: true,
				};

				const result = await createCharge.call(mockContext, data);

				expect(mockedGenericFunctions.beeminderApiRequest).toHaveBeenCalledWith(
					'POST',
					'/charges.json',
					{
						user_id: 'me',
						amount: 10,
						note: 'Penalty charge',
						dryrun: true,
					},
					{},
				);
				expect(result).toBe(mockResponse);
			});

			it('should not include undefined optional parameters', async () => {
				const mockResponse = { id: 'charge123', amount: 5 };
				mockedGenericFunctions.beeminderApiRequest.mockResolvedValue(mockResponse);

				const data = {
					amount: 5,
					note: undefined,
					dryrun: undefined,
				};

				const result = await createCharge.call(mockContext, data);

				expect(mockedGenericFunctions.beeminderApiRequest).toHaveBeenCalledWith(
					'POST',
					'/charges.json',
					{
						user_id: 'me',
						amount: 5,
					},
					{},
				);
				expect(result).toBe(mockResponse);
			});
		});

		describe('uncleGoal', () => {
			it('should uncle a goal', async () => {
				const mockResponse = { success: true };
				mockedGenericFunctions.beeminderApiRequest.mockResolvedValue(mockResponse);

				const data = { goalName: 'testgoal' };

				const result = await uncleGoal.call(mockContext, data);

				expect(mockedGenericFunctions.beeminderApiRequest).toHaveBeenCalledWith(
					'POST',
					'/users/me/goals/testgoal/uncleme.json',
				);
				expect(result).toBe(mockResponse);
			});
		});
	});

	describe('User Operations', () => {
		describe('getUser', () => {
			it('should get user information', async () => {
				const mockResponse = { username: 'testuser', goals: [] };
				mockedGenericFunctions.beeminderApiRequest.mockResolvedValue(mockResponse);

				const data = {
					associations: true,
					diff_since: 1234567890,
					skinny: false,
					emaciated: false,
					datapoints_count: 10,
				};

				const result = await getUser.call(mockContext, data);

				expect(mockedGenericFunctions.beeminderApiRequest).toHaveBeenCalledWith(
					'GET',
					'/users/me.json',
					{},
					data,
				);
				expect(result).toBe(mockResponse);
			});
		});
	});
});
