import { defineStore } from 'pinia';
import { STORES } from '@/constants';
import { workflowStoreSetupFactory } from '@/stores/workflows.store';

export const useExecutionsStore = defineStore(STORES.EXECUTIONS, workflowStoreSetupFactory());
