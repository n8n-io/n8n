import type { ElTag } from 'element-plus';

export type NodeCreatorTag = {
	text: string;
	type?: (typeof ElTag)['type'];
};
