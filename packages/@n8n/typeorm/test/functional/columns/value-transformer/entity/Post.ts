import { Entity } from '../../../../../src/decorator/entity/Entity';
import { Column } from '../../../../../src/decorator/columns/Column';
import { ValueTransformer } from '../../../../../src/decorator/options/ValueTransformer';
import { PrimaryGeneratedColumn } from '../../../../../src/decorator/columns/PrimaryGeneratedColumn';

class TagTransformer implements ValueTransformer {
	to(value: string[]): string {
		return value.join(', ');
	}

	from(value: string): string[] {
		return value.split(', ');
	}
}

export class Complex {
	x: number;
	y: number;
	circularReferenceToMySelf: {
		complex: Complex;
	};

	constructor(from: String) {
		this.circularReferenceToMySelf = { complex: this };
		const [x, y] = from.split(' ');
		this.x = +x;
		this.y = +y;
	}

	toString() {
		return `${this.x} ${this.y}`;
	}
}

class ComplexTransformer implements ValueTransformer {
	to(value: Complex | null): string | null {
		if (value == null) {
			return value;
		}
		return value.toString();
	}

	from(value: string | null): Complex | null {
		if (value == null) {
			return value;
		}
		return new Complex(value);
	}
}

@Entity()
export class Post {
	@PrimaryGeneratedColumn()
	id: number;

	@Column()
	title: string;

	@Column({ type: String, transformer: new TagTransformer() })
	tags: string[];

	@Column({
		type: String,
		transformer: new ComplexTransformer(),
		nullable: true,
	})
	complex: Complex | null;
}
