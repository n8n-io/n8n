// eslint-disable-next-line import/no-extraneous-dependencies
import { faker } from '@faker-js/faker/locale/en';
import type { IWorkflowTemplateNode } from '@/Interface';

export const newWorkflowTemplateNode = ({
	type,
	...optionalOpts
}: Pick<IWorkflowTemplateNode, 'type'> &
	Partial<IWorkflowTemplateNode>): IWorkflowTemplateNode => ({
	type,
	name: faker.commerce.productName(),
	position: [0, 0],
	parameters: {},
	typeVersion: 1,
	...optionalOpts,
});
