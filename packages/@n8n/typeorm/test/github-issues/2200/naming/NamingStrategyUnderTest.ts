import { DefaultNamingStrategy } from '../../../../src/naming-strategy/DefaultNamingStrategy';
import { NamingStrategyInterface } from '../../../../src/naming-strategy/NamingStrategyInterface';

export class NamingStrategyUnderTest
	extends DefaultNamingStrategy
	implements NamingStrategyInterface {}
