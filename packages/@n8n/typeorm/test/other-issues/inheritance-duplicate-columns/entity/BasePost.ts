import { PrimaryGeneratedColumn } from '../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { BaseContent } from './BaseContent';

export class BasePost extends BaseContent {
	@PrimaryGeneratedColumn()
	id: number;
}
