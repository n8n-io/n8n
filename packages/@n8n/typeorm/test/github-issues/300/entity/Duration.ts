import { Column } from '../../../../src/decorator/columns/Column';

export class Duration {
	@Column({ type: Number, nullable: true })
	minutes: number | null;

	@Column({ type: Number, nullable: true })
	hours: number | null;

	@Column({ type: Number, nullable: true })
	days: number | null;
}
