import { IRootState, ITag, IWorkflowsState} from '@/Interface';
import { ActionContext } from 'vuex';
import makeRestApiRequest from './helpers';

export async function renameWorkflow(context: ActionContext<IWorkflowsState, IRootState>, id: string, params: {name: string, tags: ITag[]}) {
	return await makeRestApiRequest(context, 'PATCH', `/workflows/${id}`, params);
}
