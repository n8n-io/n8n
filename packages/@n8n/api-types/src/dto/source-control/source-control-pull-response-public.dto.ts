import { SourceControlledFileSchema } from '../../schemas/source-controlled-file.schema';
import { Z } from '../../zod-class';

export class SourceControlPullResponsePublicDto extends Z.array(SourceControlledFileSchema) {}
