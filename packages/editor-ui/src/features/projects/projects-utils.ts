import { oldRoutesToProjectMap } from '@/features/projects/projects-constants';

export const translateOldRouteToProjectRoute = (
	oldRoute: keyof typeof oldRoutesToProjectMap,
	projectId: string,
) => oldRoutesToProjectMap[oldRoute].replace(':projectId', projectId);
