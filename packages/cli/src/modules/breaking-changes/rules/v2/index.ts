import { FileAccessRule } from './file-access.rule';
import { ProcessEnvAccessRule } from './process-env-access.rule';
import { RemovedNodesRule } from './removed-nodes.rule';

const v2Rules = [RemovedNodesRule, ProcessEnvAccessRule, FileAccessRule];
export { v2Rules };
