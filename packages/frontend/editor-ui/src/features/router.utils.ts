import { type RouteRecordRaw } from 'vue-router';
import { dataStoreRoutes } from '@/features/dataStore/dataStore.routes';
import { insightsRoutes } from '@/features/insights/insights.router';

// For now register module routes manually like this:
export const getModuleRoutes = (): RouteRecordRaw[] => {
	const moduleRoutes: RouteRecordRaw[] = [];

	moduleRoutes.push(...insightsRoutes, ...dataStoreRoutes);

	return moduleRoutes;
};
