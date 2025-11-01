import type { INodeProperties } from 'n8n-workflow';

import { activityOperations, activityFields } from './activityFields';
import { automationFields, automationOperations } from './automationFields';
import { memberFields, memberOperations } from './memberFields';
import { noteFields, noteOperations } from './noteFields';
import { organizationFields, organizationOperations } from './organizationFields';
import { resources } from './resources';
import { taskFields, taskOperations } from './taskFields';

export const allProperties: INodeProperties[] = [
	resources,
	activityOperations,
	memberOperations,
	noteOperations,
	organizationOperations,
	taskOperations,
	automationOperations,
	...activityFields,
	...memberFields,
	...noteFields,
	...organizationFields,
	...taskFields,
	...automationFields,
];
