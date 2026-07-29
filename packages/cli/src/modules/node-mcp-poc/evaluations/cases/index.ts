import { addFinancialReportRowTask } from './add-financial-report-row';
import { listUnreadEmailsFromSenderTask } from './list-unread-emails-from-sender';
import { updateOrderStatusTask } from './update-order-status';

export const benchmarkTasks = [
	addFinancialReportRowTask,
	updateOrderStatusTask,
	listUnreadEmailsFromSenderTask,
];
