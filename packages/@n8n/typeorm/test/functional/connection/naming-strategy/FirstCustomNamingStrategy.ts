import { DefaultNamingStrategy } from '../../../../src/naming-strategy/DefaultNamingStrategy';
import { NamingStrategyInterface } from '../../../../src/naming-strategy/NamingStrategyInterface';

export class FirstCustomNamingStrategy
	extends DefaultNamingStrategy
	implements NamingStrategyInterface
{
	tableName(className: string, customName: string): string {
		return customName ? customName.toUpperCase() : className.toUpperCase();
	}
}
