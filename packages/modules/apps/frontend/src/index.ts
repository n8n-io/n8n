export { AppsModule } from './apps.module';
export { APP_DETAIL_VIEW, APPS_LIST_VIEW, PROJECT_APPS } from './apps.constants';

// Lazy, so the shell's eager import of this entry keeps the view out of the boot chunk.
export const loadAppView = async () => (await import('./components/AppView.vue')).default;
