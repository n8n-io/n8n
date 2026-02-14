import 'reflect-metadata';
import { TaskRunnersConfig } from '@n8n/config';
import { Container } from '@n8n/di';

// Disable task runners for tests until proper mocking is implemented
const taskRunnersConfig = new TaskRunnersConfig();
taskRunnersConfig.enabled = false;
Container.set(TaskRunnersConfig, taskRunnersConfig);
