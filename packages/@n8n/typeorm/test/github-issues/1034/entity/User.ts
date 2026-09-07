import { Entity } from '../../../../src/decorator/entity/Entity';
import { PrimaryGeneratedColumn } from '../../../../src/decorator/columns/PrimaryGeneratedColumn';
import { ManyToMany } from '../../../../src/decorator/relations/ManyToMany';
import { Circle } from './Circle';

@Entity()
export class User {
	/**
	 * User's identifier
	 */
	@PrimaryGeneratedColumn({ type: 'bigint' })
	private id: string;

	@ManyToMany(
		(type: object) => Circle,
		(circle) => 'users',
	)
	private circles: Promise<Circle[]>;

	/**
	 * Getter identifier
	 *
	 * @returns {number}
	 */
	public getId(): string {
		return this.id;
	}

	/**
	 * Setter identifier
	 *
	 * @param id new identifier value
	 */
	public setId(id: string): void {
		this.id = id;
	}
	/**
	 * Getter circles
	 *
	 * @returns {Circle[]}
	 */
	public getCircles(): Promise<Circle[]> {
		return this.circles;
	}

	/**
	 * Setter circle
	 *
	 * @param circles new circle value
	 */
	public setCircles(circles: Promise<Circle[]>): void {
		this.circles = circles;
	}
}
