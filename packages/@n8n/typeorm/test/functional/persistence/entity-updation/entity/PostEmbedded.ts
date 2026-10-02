import { PrimaryColumn } from '../../../../../src/decorator/columns/PrimaryColumn';
import { UpdateDateColumn } from '../../../../../src/decorator/columns/UpdateDateColumn';
import { CreateDateColumn } from '../../../../../src/decorator/columns/CreateDateColumn';
import { VersionColumn } from '../../../../../src/decorator/columns/VersionColumn';

export class PostEmbedded {
	@PrimaryColumn()
	secondId: number;

	@CreateDateColumn()
	createDate: Date;

	@UpdateDateColumn()
	updateDate: Date;

	@VersionColumn()
	version: number;
}
