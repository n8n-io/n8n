import { addFinancialReportRowTask } from './add-financial-report-row';
import { createNotionDatabasePageTask } from './create-notion-database-page';
import { listUnreadEmailsFromSenderTask } from './list-unread-emails-from-sender';
import { searchNotionTask } from './search-notion';
import { updateOrderStatusTask } from './update-order-status';

export const benchmarkTasks = [
	addFinancialReportRowTask,
	updateOrderStatusTask,
	listUnreadEmailsFromSenderTask,
	searchNotionTask,
	createNotionDatabasePageTask,
];
