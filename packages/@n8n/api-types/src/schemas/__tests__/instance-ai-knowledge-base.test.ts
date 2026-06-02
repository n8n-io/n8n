import { getRenderHint } from '../instance-ai.schema';
import {
	isKnowledgeBaseWorkspaceToolCall,
	SANDBOX_KNOWLEDGE_BASE_INDEX_PATH,
	SANDBOX_WORKSPACE_ROOT,
} from '../instance-ai-knowledge-base';

const KNOWLEDGE_BASE_SCHEDULING_GUIDE_PATH = `${SANDBOX_WORKSPACE_ROOT}/knowledge-base/best-practices/scheduling.md`;

describe('isKnowledgeBaseWorkspaceToolCall', () => {
	it('returns true for knowledge-base file reads using the full sandbox path', () => {
		expect(
			isKnowledgeBaseWorkspaceToolCall('workspace_read_file', {
				path: KNOWLEDGE_BASE_SCHEDULING_GUIDE_PATH,
			}),
		).toBe(true);
	});

	it('returns true for grep commands targeting the sandbox knowledge base', () => {
		expect(
			isKnowledgeBaseWorkspaceToolCall('workspace_execute_command', {
				command: `grep -R "webhook" ${SANDBOX_WORKSPACE_ROOT}/knowledge-base/best-practices`,
			}),
		).toBe(true);
	});

	it('returns false for relative knowledge-base paths outside the sandbox root', () => {
		expect(
			isKnowledgeBaseWorkspaceToolCall('workspace_read_file', {
				path: 'knowledge-base/best-practices/scheduling.md',
			}),
		).toBe(false);
	});

	it('returns false for unrelated workspace paths', () => {
		expect(
			isKnowledgeBaseWorkspaceToolCall('workspace_read_file', {
				path: `${SANDBOX_WORKSPACE_ROOT}/node-types/index.txt`,
			}),
		).toBe(false);
	});

	it('returns false for non-workspace tools', () => {
		expect(isKnowledgeBaseWorkspaceToolCall('load_skill', { name: 'workflow-builder' })).toBe(
			false,
		);
	});
});

describe('getRenderHint with knowledge-base args', () => {
	it('returns knowledge-base for sandbox best-practice reads', () => {
		expect(
			getRenderHint('workspace_read_file', {
				path: SANDBOX_KNOWLEDGE_BASE_INDEX_PATH,
			}),
		).toBe('knowledge-base');
	});
});
