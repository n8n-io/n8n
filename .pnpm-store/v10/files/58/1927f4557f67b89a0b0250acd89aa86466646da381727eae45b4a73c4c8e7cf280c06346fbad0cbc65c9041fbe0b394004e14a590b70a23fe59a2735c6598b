/**
 * Type definitions for BigInteger.js
 * Definitions by: Tommy Frazier <https://github.com/toefraz>
 */
export = bigInt;
export as namespace bigInt;

declare var bigInt: bigInt.BigIntegerStatic;

declare namespace bigInt {
    type BigNumber = number | bigint | string | BigInteger;

    interface BigIntegerStatic {
        /**
         * Equivalent to bigInt(0).
         */
        (): BigInteger;

        /**
         * Parse a Javascript number into a bigInt.
         */
        (number: number): BigInteger;

        /**
         * Parse a Javascript native bigint into a bigInt.
         */
        (number: bigint): BigInteger;

        /**
         * Parse a string into a bigInt.
         * Default base is 10.
         * Default alphabet is "0123456789abcdefghijklmnopqrstuvwxyz".
         * caseSensitive defaults to false.
         */
        (string: string, base?: BigNumber, alphabet?: string, caseSensitive?: boolean): BigInteger;

        /**
         * no-op.
         */
        (bigInt: BigInteger): BigInteger;

        /**
         * Constructs a bigInt from an array of digits in specified base.
         * The optional isNegative flag will make the number negative.
         */
        fromArray: (digits: BigNumber[], base?: BigNumber, isNegative?: boolean) => BigInteger;

        /**
         * Finds the greatest common denominator of a and b.
         */
        gcd: (a: BigNumber, b: BigNumber) => BigInteger;


        /**
         * Returns true if x is a BigInteger, false otherwise.
         */
        isInstance: (x: any) => x is BigInteger;

        /**
         * Finds the least common multiple of a and b.
         */
        lcm: (a: BigNumber, b: BigNumber) => BigInteger;

        /**
         * Returns the largest of a and b.
         */
        max: (a: BigNumber, b: BigNumber) => BigInteger;

        /**
         * Returns the smallest of a and b.
         */
        min: (a: BigNumber, b: BigNumber) => BigInteger;

        /**
         * Equivalent to bigInt(-1).
         */
        minusOne: BigInteger;

        /**
         * Equivalent to bigInt(1).
         */
        one: BigInteger;

        /**
         * Returns a random number between min and max.
         */
        randBetween: (min: BigNumber, max: BigNumber, rng?: () => number) => BigInteger;

        /**
         * Equivalent to bigInt(0).
         */
        zero: BigInteger;
    }

    interface BigInteger {
        /**
         * Returns the absolute value of a bigInt.
         */
        abs(): BigInteger;

        /**
         * Performs addition.
         */
        add(number: BigNumber): BigInteger;

        /**
         * Performs the bitwise AND operation.
         */
        and(number: BigNumber): BigInteger;

        /**
         * Returns the number of digits required to represent a bigInt in binary.
         */
        bitLength(): BigInteger;

        /**
         * Performs a comparison between two numbers. If the numbers are equal, it returns 0.
         * If the first number is greater, it returns 1. If the first number is lesser, it returns -1.
         */
        compare(number: BigNumber): number;

        /**
         * Performs a comparison between the absolute value of two numbers.
         */
        compareAbs(number: BigNumber): number;

        /**
         * Alias for the compare method.
         */
        compareTo(number: BigNumber): number;

        /**
         * Performs integer division, disregarding the remainder.
         */
        divide(number: BigNumber): BigInteger;

        /**
         * Performs division and returns an object with two properties: quotient and remainder.
         * The sign of the remainder will match the sign of the dividend.
         */
        divmod(number: BigNumber): { quotient: BigInteger, remainder: BigInteger };

        /**
         * Alias for the equals method.
         */
        eq(number: BigNumber): boolean;

        /**
         * Checks if two numbers are equal.
         */
        equals(number: BigNumber): boolean;

        /**
         * Alias for the greaterOrEquals method.
         */
        geq(number: BigNumber): boolean;

        /**
         * Checks if the first number is greater than the second.
         */
        greater(number: BigNumber): boolean;

        /**
         * Checks if the first number is greater than or equal to the second.
         */
        greaterOrEquals(number: BigNumber): boolean;

        /**
         * Alias for the greater method.
         */
        gt(number: BigNumber): boolean;

        /**
         * Returns true if the first number is divisible by the second number, false otherwise.
         */
        isDivisibleBy(number: BigNumber): boolean;

        /**
         * Returns true if the number is even, false otherwise.
         */
        isEven(): boolean;

        /**
         * Returns true if the number is negative, false otherwise.
         * Returns false for 0 and true for -0.
         */
        isNegative(): boolean;

        /**
         * Returns true if the number is odd, false otherwise.
         */
        isOdd(): boolean;

        /**
         * Return true if the number is positive, false otherwise.
         * Returns true for 0 and false for -0.
         */
        isPositive(): boolean;

        /**
         * Returns true if the number is prime, false otherwise.
         */
        isPrime(strict?: boolean): boolean;

        /**
         * Returns true if the number is very likely to be prime, false otherwise.
         */
        isProbablePrime(iterations?: number, rng?: () => number): boolean;

        /**
         * Returns true if the number is 1 or -1, false otherwise.
         */
        isUnit(): boolean;

        /**
         * Return true if the number is 0 or -0, false otherwise.
         */
        isZero(): boolean;

        /**
         * Alias for the lesserOrEquals method.
         */
        leq(number: BigNumber): boolean;

        /**
         * Checks if the first number is lesser than the second.
         */
        lesser(number: BigNumber): boolean;

        /**
         * Checks if the first number is less than or equal to the second.
         */
        lesserOrEquals(number: BigNumber): boolean;

        /**
         * Alias for the lesser method.
         */
        lt(number: BigNumber): boolean;

        /**
         * Alias for the subtract method.
         */
        minus(number: BigNumber): BigInteger;

        /**
         * Performs division and returns the remainder, disregarding the quotient.
         * The sign of the remainder will match the sign of the dividend.
         */
        mod(number: BigNumber): BigInteger;

        /**
         * Finds the multiplicative inverse of the number modulo mod.
         */
        modInv(number: BigNumber): BigInteger;

        /**
         * Takes the number to the power exp modulo mod.
         */
        modPow(exp: BigNumber, mod: BigNumber): BigInteger;

        /**
         * Performs multiplication.
         */
        multiply(number: BigNumber): BigInteger;

        /**
         * Reverses the sign of the number.
         */
        negate(): BigInteger;

        /**
         * Alias for the notEquals method.
         */
        neq(number: BigNumber): boolean;

        /**
         * Adds one to the number.
         */
        next(): BigInteger;

        /**
         * Performs the bitwise NOT operation.
         */
        not(): BigInteger;

        /**
         * Checks if two numbers are not equal.
         */
        notEquals(number: BigNumber): boolean;

        /**
         * Performs the bitwise OR operation.
         */
        or(number: BigNumber): BigInteger;

        /**
         * Alias for the divide method.
         */
        over(number: BigNumber): BigInteger;

        /**
         * Alias for the add method.
         */
        plus(number: BigNumber): BigInteger;

        /**
         * Performs exponentiation. If the exponent is less than 0, pow returns 0.
         * bigInt.zero.pow(0) returns 1.
         */
        pow(number: BigNumber): BigInteger;

        /**
         * Subtracts one from the number.
         */
        prev(): BigInteger;

        /**
         * Alias for the mod method.
         */
        remainder(number: BigNumber): BigInteger;

        /**
         * Shifts the number left by n places in its binary representation.
         * If a negative number is provided, it will shift right.
         *
         * Throws an error if number is outside of the range [-9007199254740992, 9007199254740992].
         */
        shiftLeft(number: BigNumber): BigInteger;

        /**
         * Shifts the number right by n places in its binary representation.
         * If a negative number is provided, it will shift left.
         *
         * Throws an error if number is outside of the range [-9007199254740992, 9007199254740992].
         */
        shiftRight(number: BigNumber): BigInteger;

        /**
         * Squares the number.
         */
        square(): BigInteger;

        /**
         * Performs subtraction.
         */
        subtract(number: BigNumber): BigInteger;

        /**
         * Alias for the multiply method.
         */
        times(number: BigNumber): BigInteger;

        /**
         *
         * Converts a bigInt to an object representing it as an array of integers module the given radix.
         */
        toArray(radix: number): BaseArray;

        /**
         * Converts a bigInt into a native Javascript number. Loses precision for numbers outside the range.
         */
        toJSNumber(): number;

        /**
         * Converts a bigInt to a string.
         */
        toString(radix?: number, alphabet?: string): string;

		/**
         * Converts a bigInt to a string. This method is called behind the scenes in JSON.stringify.
         */
        toJSON(): string;

        /**
         * Converts a bigInt to a native Javascript number. This override allows you to use native
         * arithmetic operators without explicit conversion.
         */
        valueOf(): number;

        /**
         * Performs the bitwise XOR operation.
         */
        xor(number: BigNumber): BigInteger;
    }

    // Array constant accessors
    interface BigIntegerStatic {
        '-999': BigInteger;
        '-998': BigInteger;
        '-997': BigInteger;
        '-996': BigInteger;
        '-995': BigInteger;
        '-994': BigInteger;
        '-993': BigInteger;
        '-992': BigInteger;
        '-991': BigInteger;
        '-990': BigInteger;
        '-989': BigInteger;
        '-988': BigInteger;
        '-987': BigInteger;
        '-986': BigInteger;
        '-985': BigInteger;
        '-984': BigInteger;
        '-983': BigInteger;
        '-982': BigInteger;
        '-981': BigInteger;
        '-980': BigInteger;
        '-979': BigInteger;
        '-978': BigInteger;
        '-977': BigInteger;
        '-976': BigInteger;
        '-975': BigInteger;
        '-974': BigInteger;
        '-973': BigInteger;
        '-972': BigInteger;
        '-971': BigInteger;
        '-970': BigInteger;
        '-969': BigInteger;
        '-968': BigInteger;
        '-967': BigInteger;
        '-966': BigInteger;
        '-965': BigInteger;
        '-964': BigInteger;
        '-963': BigInteger;
        '-962': BigInteger;
        '-961': BigInteger;
        '-960': BigInteger;
        '-959': BigInteger;
        '-958': BigInteger;
        '-957': BigInteger;
        '-956': BigInteger;
        '-955': BigInteger;
        '-954': BigInteger;
        '-953': BigInteger;
        '-952': BigInteger;
        '-951': BigInteger;
        '-950': BigInteger;
        '-949': BigInteger;
        '-948': BigInteger;
        '-947': BigInteger;
        '-946': BigInteger;
        '-945': BigInteger;
        '-944': BigInteger;
        '-943': BigInteger;
        '-942': BigInteger;
        '-941': BigInteger;
        '-940': BigInteger;
        '-939': BigInteger;
        '-938': BigInteger;
        '-937': BigInteger;
        '-936': BigInteger;
        '-935': BigInteger;
        '-934': BigInteger;
        '-933': BigInteger;
        '-932': BigInteger;
        '-931': BigInteger;
        '-930': BigInteger;
        '-929': BigInteger;
        '-928': BigInteger;
        '-927': BigInteger;
        '-926': BigInteger;
        '-925': BigInteger;
        '-924': BigInteger;
        '-923': BigInteger;
        '-922': BigInteger;
        '-921': BigInteger;
        '-920': BigInteger;
        '-919': BigInteger;
        '-918': BigInteger;
        '-917': BigInteger;
        '-916': BigInteger;
        '-915': BigInteger;
        '-914': BigInteger;
        '-913': BigInteger;
        '-912': BigInteger;
        '-911': BigInteger;
        '-910': BigInteger;
        '-909': BigInteger;
        '-908': BigInteger;
        '-907': BigInteger;
        '-906': BigInteger;
        '-905': BigInteger;
        '-904': BigInteger;
        '-903': BigInteger;
        '-902': BigInteger;
        '-901': BigInteger;
        '-900': BigInteger;
        '-899': BigInteger;
        '-898': BigInteger;
        '-897': BigInteger;
        '-896': BigInteger;
        '-895': BigInteger;
        '-894': BigInteger;
        '-893': BigInteger;
        '-892': BigInteger;
        '-891': BigInteger;
        '-890': BigInteger;
        '-889': BigInteger;
        '-888': BigInteger;
        '-887': BigInteger;
        '-886': BigInteger;
        '-885': BigInteger;
        '-884': BigInteger;
        '-883': BigInteger;
        '-882': BigInteger;
        '-881': BigInteger;
        '-880': BigInteger;
        '-879': BigInteger;
        '-878': BigInteger;
        '-877': BigInteger;
        '-876': BigInteger;
        '-875': BigInteger;
        '-874': BigInteger;
        '-873': BigInteger;
        '-872': BigInteger;
        '-871': BigInteger;
        '-870': BigInteger;
        '-869': BigInteger;
        '-868': BigInteger;
        '-867': BigInteger;
        '-866': BigInteger;
        '-865': BigInteger;
        '-864': BigInteger;
        '-863': BigInteger;
        '-862': BigInteger;
        '-861': BigInteger;
        '-860': BigInteger;
        '-859': BigInteger;
        '-858': BigInteger;
        '-857': BigInteger;
        '-856': BigInteger;
        '-855': BigInteger;
        '-854': BigInteger;
        '-853': BigInteger;
        '-852': BigInteger;
        '-851': BigInteger;
        '-850': BigInteger;
        '-849': BigInteger;
        '-848': BigInteger;
        '-847': BigInteger;
        '-846': BigInteger;
        '-845': BigInteger;
        '-844': BigInteger;
        '-843': BigInteger;
        '-842': BigInteger;
        '-841': BigInteger;
        '-840': BigInteger;
        '-839': BigInteger;
        '-838': BigInteger;
        '-837': BigInteger;
        '-836': BigInteger;
        '-835': BigInteger;
        '-834': BigInteger;
        '-833': BigInteger;
        '-832': BigInteger;
        '-831': BigInteger;
        '-830': BigInteger;
        '-829': BigInteger;
        '-828': BigInteger;
        '-827': BigInteger;
        '-826': BigInteger;
        '-825': BigInteger;
        '-824': BigInteger;
        '-823': BigInteger;
        '-822': BigInteger;
        '-821': BigInteger;
        '-820': BigInteger;
        '-819': BigInteger;
        '-818': BigInteger;
        '-817': BigInteger;
        '-816': BigInteger;
        '-815': BigInteger;
        '-814': BigInteger;
        '-813': BigInteger;
        '-812': BigInteger;
        '-811': BigInteger;
        '-810': BigInteger;
        '-809': BigInteger;
        '-808': BigInteger;
        '-807': BigInteger;
        '-806': BigInteger;
        '-805': BigInteger;
        '-804': BigInteger;
        '-803': BigInteger;
        '-802': BigInteger;
        '-801': BigInteger;
        '-800': BigInteger;
        '-799': BigInteger;
        '-798': BigInteger;
        '-797': BigInteger;
        '-796': BigInteger;
        '-795': BigInteger;
        '-794': BigInteger;
        '-793': BigInteger;
        '-792': BigInteger;
        '-791': BigInteger;
        '-790': BigInteger;
        '-789': BigInteger;
        '-788': BigInteger;
        '-787': BigInteger;
        '-786': BigInteger;
        '-785': BigInteger;
        '-784': BigInteger;
        '-783': BigInteger;
        '-782': BigInteger;
        '-781': BigInteger;
        '-780': BigInteger;
        '-779': BigInteger;
        '-778': BigInteger;
        '-777': BigInteger;
        '-776': BigInteger;
        '-775': BigInteger;
        '-774': BigInteger;
        '-773': BigInteger;
        '-772': BigInteger;
        '-771': BigInteger;
        '-770': BigInteger;
        '-769': BigInteger;
        '-768': BigInteger;
        '-767': BigInteger;
        '-766': BigInteger;
        '-765': BigInteger;
        '-764': BigInteger;
        '-763': BigInteger;
        '-762': BigInteger;
        '-761': BigInteger;
        '-760': BigInteger;
        '-759': BigInteger;
        '-758': BigInteger;
        '-757': BigInteger;
        '-756': BigInteger;
        '-755': BigInteger;
        '-754': BigInteger;
        '-753': BigInteger;
        '-752': BigInteger;
        '-751': BigInteger;
        '-750': BigInteger;
        '-749': BigInteger;
        '-748': BigInteger;
        '-747': BigInteger;
        '-746': BigInteger;
        '-745': BigInteger;
        '-744': BigInteger;
        '-743': BigInteger;
        '-742': BigInteger;
        '-741': BigInteger;
        '-740': BigInteger;
        '-739': BigInteger;
        '-738': BigInteger;
        '-737': BigInteger;
        '-736': BigInteger;
        '-735': BigInteger;
        '-734': BigInteger;
        '-733': BigInteger;
        '-732': BigInteger;
        '-731': BigInteger;
        '-730': BigInteger;
        '-729': BigInteger;
        '-728': BigInteger;
        '-727': BigInteger;
        '-726': BigInteger;
        '-725': BigInteger;
        '-724': BigInteger;
        '-723': BigInteger;
        '-722': BigInteger;
        '-721': BigInteger;
        '-720': BigInteger;
        '-719': BigInteger;
        '-718': BigInteger;
        '-717': BigInteger;
        '-716': BigInteger;
        '-715': BigInteger;
        '-714': BigInteger;
        '-713': BigInteger;
        '-712': BigInteger;
        '-711': BigInteger;
        '-710': BigInteger;
        '-709': BigInteger;
        '-708': BigInteger;
        '-707': BigInteger;
        '-706': BigInteger;
        '-705': BigInteger;
        '-704': BigInteger;
        '-703': BigInteger;
        '-702': BigInteger;
        '-701': BigInteger;
        '-700': BigInteger;
        '-699': BigInteger;
        '-698': BigInteger;
        '-697': BigInteger;
        '-696': BigInteger;
        '-695': BigInteger;
        '-694': BigInteger;
        '-693': BigInteger;
        '-692': BigInteger;
        '-691': BigInteger;
        '-690': BigInteger;
        '-689': BigInteger;
        '-688': BigInteger;
        '-687': BigInteger;
        '-686': BigInteger;
        '-685': BigInteger;
        '-684': BigInteger;
        '-683': BigInteger;
        '-682': BigInteger;
        '-681': BigInteger;
        '-680': BigInteger;
        '-679': BigInteger;
        '-678': BigInteger;
        '-677': BigInteger;
        '-676': BigInteger;
        '-675': BigInteger;
        '-674': BigInteger;
        '-673': BigInteger;
        '-672': BigInteger;
        '-671': BigInteger;
        '-670': BigInteger;
        '-669': BigInteger;
        '-668': BigInteger;
        '-667': BigInteger;
        '-666': BigInteger;
        '-665': BigInteger;
        '-664': BigInteger;
        '-663': BigInteger;
        '-662': BigInteger;
        '-661': BigInteger;
        '-660': BigInteger;
        '-659': BigInteger;
        '-658': BigInteger;
        '-657': BigInteger;
        '-656': BigInteger;
        '-655': BigInteger;
        '-654': BigInteger;
        '-653': BigInteger;
        '-652': BigInteger;
        '-651': BigInteger;
        '-650': BigInteger;
        '-649': BigInteger;
        '-648': BigInteger;
        '-647': BigInteger;
        '-646': BigInteger;
        '-645': BigInteger;
        '-644': BigInteger;
        '-643': BigInteger;
        '-642': BigInteger;
        '-641': BigInteger;
        '-640': BigInteger;
        '-639': BigInteger;
        '-638': BigInteger;
        '-637': BigInteger;
        '-636': BigInteger;
        '-635': BigInteger;
        '-634': BigInteger;
        '-633': BigInteger;
        '-632': BigInteger;
        '-631': BigInteger;
        '-630': BigInteger;
        '-629': BigInteger;
        '-628': BigInteger;
        '-627': BigInteger;
        '-626': BigInteger;
        '-625': BigInteger;
        '-624': BigInteger;
        '-623': BigInteger;
        '-622': BigInteger;
        '-621': BigInteger;
        '-620': BigInteger;
        '-619': BigInteger;
        '-618': BigInteger;
        '-617': BigInteger;
        '-616': BigInteger;
        '-615': BigInteger;
        '-614': BigInteger;
        '-613': BigInteger;
        '-612': BigInteger;
        '-611': BigInteger;
        '-610': BigInteger;
        '-609': BigInteger;
        '-608': BigInteger;
        '-607': BigInteger;
        '-606': BigInteger;
        '-605': BigInteger;
        '-604': BigInteger;
        '-603': BigInteger;
        '-602': BigInteger;
        '-601': BigInteger;
        '-600': BigInteger;
        '-599': BigInteger;
        '-598': BigInteger;
        '-597': BigInteger;
        '-596': BigInteger;
        '-595': BigInteger;
        '-594': BigInteger;
        '-593': BigInteger;
        '-592': BigInteger;
        '-591': BigInteger;
        '-590': BigInteger;
        '-589': BigInteger;
        '-588': BigInteger;
        '-587': BigInteger;
        '-586': BigInteger;
        '-585': BigInteger;
        '-584': BigInteger;
        '-583': BigInteger;
        '-582': BigInteger;
        '-581': BigInteger;
        '-580': BigInteger;
        '-579': BigInteger;
        '-578': BigInteger;
        '-577': BigInteger;
        '-576': BigInteger;
        '-575': BigInteger;
        '-574': BigInteger;
        '-573': BigInteger;
        '-572': BigInteger;
        '-571': BigInteger;
        '-570': BigInteger;
        '-569': BigInteger;
        '-568': BigInteger;
        '-567': BigInteger;
        '-566': BigInteger;
        '-565': BigInteger;
        '-564': BigInteger;
        '-563': BigInteger;
        '-562': BigInteger;
        '-561': BigInteger;
        '-560': BigInteger;
        '-559': BigInteger;
        '-558': BigInteger;
        '-557': BigInteger;
        '-556': BigInteger;
        '-555': BigInteger;
        '-554': BigInteger;
        '-553': BigInteger;
        '-552': BigInteger;
        '-551': BigInteger;
        '-550': BigInteger;
        '-549': BigInteger;
        '-548': BigInteger;
        '-547': BigInteger;
        '-546': BigInteger;
        '-545': BigInteger;
        '-544': BigInteger;
        '-543': BigInteger;
        '-542': BigInteger;
        '-541': BigInteger;
        '-540': BigInteger;
        '-539': BigInteger;
        '-538': BigInteger;
        '-537': BigInteger;
        '-536': BigInteger;
        '-535': BigInteger;
        '-534': BigInteger;
        '-533': BigInteger;
        '-532': BigInteger;
        '-531': BigInteger;
        '-530': BigInteger;
        '-529': BigInteger;
        '-528': BigInteger;
        '-527': BigInteger;
        '-526': BigInteger;
        '-525': BigInteger;
        '-524': BigInteger;
        '-523': BigInteger;
        '-522': BigInteger;
        '-521': BigInteger;
        '-520': BigInteger;
        '-519': BigInteger;
        '-518': BigInteger;
        '-517': BigInteger;
        '-516': BigInteger;
        '-515': BigInteger;
        '-514': BigInteger;
        '-513': BigInteger;
        '-512': BigInteger;
        '-511': BigInteger;
        '-510': BigInteger;
        '-509': BigInteger;
        '-508': BigInteger;
        '-507': BigInteger;
        '-506': BigInteger;
        '-505': BigInteger;
        '-504': BigInteger;
        '-503': BigInteger;
        '-502': BigInteger;
        '-501': BigInteger;
        '-500': BigInteger;
        '-499': BigInteger;
        '-498': BigInteger;
        '-497': BigInteger;
        '-496': BigInteger;
        '-495': BigInteger;
        '-494': BigInteger;
        '-493': BigInteger;
        '-492': BigInteger;
        '-491': BigInteger;
        '-490': BigInteger;
        '-489': BigInteger;
        '-488': BigInteger;
        '-487': BigInteger;
        '-486': BigInteger;
        '-485': BigInteger;
        '-484': BigInteger;
        '-483': BigInteger;
        '-482': BigInteger;
        '-481': BigInteger;
        '-480': BigInteger;
        '-479': BigInteger;
        '-478': BigInteger;
        '-477': BigInteger;
        '-476': BigInteger;
        '-475': BigInteger;
        '-474': BigInteger;
        '-473': BigInteger;
        '-472': BigInteger;
        '-471': BigInteger;
        '-470': BigInteger;
        '-469': BigInteger;
        '-468': BigInteger;
        '-467': BigInteger;
        '-466': BigInteger;
        '-465': BigInteger;
        '-464': BigInteger;
        '-463': BigInteger;
        '-462': BigInteger;
        '-461': BigInteger;
        '-460': BigInteger;
        '-459': BigInteger;
        '-458': BigInteger;
        '-457': BigInteger;
        '-456': BigInteger;
        '-455': BigInteger;
        '-454': BigInteger;
        '-453': BigInteger;
        '-452': BigInteger;
        '-451': BigInteger;
        '-450': BigInteger;
        '-449': BigInteger;
        '-448': BigInteger;
        '-447': BigInteger;
        '-446': BigInteger;
        '-445': BigInteger;
        '-444': BigInteger;
        '-443': BigInteger;
        '-442': BigInteger;
        '-441': BigInteger;
        '-440': BigInteger;
        '-439': BigInteger;
        '-438': BigInteger;
        '-437': BigInteger;
        '-436': BigInteger;
        '-435': BigInteger;
        '-434': BigInteger;
        '-433': BigInteger;
        '-432': BigInteger;
        '-431': BigInteger;
        '-430': BigInteger;
        '-429': BigInteger;
        '-428': BigInteger;
        '-427': BigInteger;
        '-426': BigInteger;
        '-425': BigInteger;
        '-424': BigInteger;
        '-423': BigInteger;
        '-422': BigInteger;
        '-421': BigInteger;
        '-420': BigInteger;
        '-419': BigInteger;
        '-418': BigInteger;
        '-417': BigInteger;
        '-416': BigInteger;
        '-415': BigInteger;
        '-414': BigInteger;
        '-413': BigInteger;
        '-412': BigInteger;
        '-411': BigInteger;
        '-410': BigInteger;
        '-409': BigInteger;
        '-408': BigInteger;
        '-407': BigInteger;
        '-406': BigInteger;
        '-405': BigInteger;
        '-404': BigInteger;
        '-403': BigInteger;
        '-402': BigInteger;
        '-401': BigInteger;
        '-400': BigInteger;
        '-399': BigInteger;
        '-398': BigInteger;
        '-397': BigInteger;
        '-396': BigInteger;
        '-395': BigInteger;
        '-394': BigInteger;
        '-393': BigInteger;
        '-392': BigInteger;
        '-391': BigInteger;
        '-390': BigInteger;
        '-389': BigInteger;
        '-388': BigInteger;
        '-387': BigInteger;
        '-386': BigInteger;
        '-385': BigInteger;
        '-384': BigInteger;
        '-383': BigInteger;
        '-382': BigInteger;
        '-381': BigInteger;
        '-380': BigInteger;
        '-379': BigInteger;
        '-378': BigInteger;
        '-377': BigInteger;
        '-376': BigInteger;
        '-375': BigInteger;
        '-374': BigInteger;
        '-373': BigInteger;
        '-372': BigInteger;
        '-371': BigInteger;
        '-370': BigInteger;
        '-369': BigInteger;
        '-368': BigInteger;
        '-367': BigInteger;
        '-366': BigInteger;
        '-365': BigInteger;
        '-364': BigInteger;
        '-363': BigInteger;
        '-362': BigInteger;
        '-361': BigInteger;
        '-360': BigInteger;
        '-359': BigInteger;
        '-358': BigInteger;
        '-357': BigInteger;
        '-356': BigInteger;
        '-355': BigInteger;
        '-354': BigInteger;
        '-353': BigInteger;
        '-352': BigInteger;
        '-351': BigInteger;
        '-350': BigInteger;
        '-349': BigInteger;
        '-348': BigInteger;
        '-347': BigInteger;
        '-346': BigInteger;
        '-345': BigInteger;
        '-344': BigInteger;
        '-343': BigInteger;
        '-342': BigInteger;
        '-341': BigInteger;
        '-340': BigInteger;
        '-339': BigInteger;
        '-338': BigInteger;
        '-337': BigInteger;
        '-336': BigInteger;
        '-335': BigInteger;
        '-334': BigInteger;
        '-333': BigInteger;
        '-332': BigInteger;
        '-331': BigInteger;
        '-330': BigInteger;
        '-329': BigInteger;
        '-328': BigInteger;
        '-327': BigInteger;
        '-326': BigInteger;
        '-325': BigInteger;
        '-324': BigInteger;
        '-323': BigInteger;
        '-322': BigInteger;
        '-321': BigInteger;
        '-320': BigInteger;
        '-319': BigInteger;
        '-318': BigInteger;
        '-317': BigInteger;
        '-316': BigInteger;
        '-315': BigInteger;
        '-314': BigInteger;
        '-313': BigInteger;
        '-312': BigInteger;
        '-311': BigInteger;
        '-310': BigInteger;
        '-309': BigInteger;
        '-308': BigInteger;
        '-307': BigInteger;
        '-306': BigInteger;
        '-305': BigInteger;
        '-304': BigInteger;
        '-303': BigInteger;
        '-302': BigInteger;
        '-301': BigInteger;
        '-300': BigInteger;
        '-299': BigInteger;
        '-298': BigInteger;
        '-297': BigInteger;
        '-296': BigInteger;
        '-295': BigInteger;
        '-294': BigInteger;
        '-293': BigInteger;
        '-292': BigInteger;
        '-291': BigInteger;
        '-290': BigInteger;
        '-289': BigInteger;
        '-288': BigInteger;
        '-287': BigInteger;
        '-286': BigInteger;
        '-285': BigInteger;
        '-284': BigInteger;
        '-283': BigInteger;
        '-282': BigInteger;
        '-281': BigInteger;
        '-280': BigInteger;
        '-279': BigInteger;
        '-278': BigInteger;
        '-277': BigInteger;
        '-276': BigInteger;
        '-275': BigInteger;
        '-274': BigInteger;
        '-273': BigInteger;
        '-272': BigInteger;
        '-271': BigInteger;
        '-270': BigInteger;
        '-269': BigInteger;
        '-268': BigInteger;
        '-267': BigInteger;
        '-266': BigInteger;
        '-265': BigInteger;
        '-264': BigInteger;
        '-263': BigInteger;
        '-262': BigInteger;
        '-261': BigInteger;
        '-260': BigInteger;
        '-259': BigInteger;
        '-258': BigInteger;
        '-257': BigInteger;
        '-256': BigInteger;
        '-255': BigInteger;
        '-254': BigInteger;
        '-253': BigInteger;
        '-252': BigInteger;
        '-251': BigInteger;
        '-250': BigInteger;
        '-249': BigInteger;
        '-248': BigInteger;
        '-247': BigInteger;
        '-246': BigInteger;
        '-245': BigInteger;
        '-244': BigInteger;
        '-243': BigInteger;
        '-242': BigInteger;
        '-241': BigInteger;
        '-240': BigInteger;
        '-239': BigInteger;
        '-238': BigInteger;
        '-237': BigInteger;
        '-236': BigInteger;
        '-235': BigInteger;
        '-234': BigInteger;
        '-233': BigInteger;
        '-232': BigInteger;
        '-231': BigInteger;
        '-230': BigInteger;
        '-229': BigInteger;
        '-228': BigInteger;
        '-227': BigInteger;
        '-226': BigInteger;
        '-225': BigInteger;
        '-224': BigInteger;
        '-223': BigInteger;
        '-222': BigInteger;
        '-221': BigInteger;
        '-220': BigInteger;
        '-219': BigInteger;
        '-218': BigInteger;
        '-217': BigInteger;
        '-216': BigInteger;
        '-215': BigInteger;
        '-214': BigInteger;
        '-213': BigInteger;
        '-212': BigInteger;
        '-211': BigInteger;
        '-210': BigInteger;
        '-209': BigInteger;
        '-208': BigInteger;
        '-207': BigInteger;
        '-206': BigInteger;
        '-205': BigInteger;
        '-204': BigInteger;
        '-203': BigInteger;
        '-202': BigInteger;
        '-201': BigInteger;
        '-200': BigInteger;
        '-199': BigInteger;
        '-198': BigInteger;
        '-197': BigInteger;
        '-196': BigInteger;
        '-195': BigInteger;
        '-194': BigInteger;
        '-193': BigInteger;
        '-192': BigInteger;
        '-191': BigInteger;
        '-190': BigInteger;
        '-189': BigInteger;
        '-188': BigInteger;
        '-187': BigInteger;
        '-186': BigInteger;
        '-185': BigInteger;
        '-184': BigInteger;
        '-183': BigInteger;
        '-182': BigInteger;
        '-181': BigInteger;
        '-180': BigInteger;
        '-179': BigInteger;
        '-178': BigInteger;
        '-177': BigInteger;
        '-176': BigInteger;
        '-175': BigInteger;
        '-174': BigInteger;
        '-173': BigInteger;
        '-172': BigInteger;
        '-171': BigInteger;
        '-170': BigInteger;
        '-169': BigInteger;
        '-168': BigInteger;
        '-167': BigInteger;
        '-166': BigInteger;
        '-165': BigInteger;
        '-164': BigInteger;
        '-163': BigInteger;
        '-162': BigInteger;
        '-161': BigInteger;
        '-160': BigInteger;
        '-159': BigInteger;
        '-158': BigInteger;
        '-157': BigInteger;
        '-156': BigInteger;
        '-155': BigInteger;
        '-154': BigInteger;
        '-153': BigInteger;
        '-152': BigInteger;
        '-151': BigInteger;
        '-150': BigInteger;
        '-149': BigInteger;
        '-148': BigInteger;
        '-147': BigInteger;
        '-146': BigInteger;
        '-145': BigInteger;
        '-144': BigInteger;
        '-143': BigInteger;
        '-142': BigInteger;
        '-141': BigInteger;
        '-140': BigInteger;
        '-139': BigInteger;
        '-138': BigInteger;
        '-137': BigInteger;
        '-136': BigInteger;
        '-135': BigInteger;
        '-134': BigInteger;
        '-133': BigInteger;
        '-132': BigInteger;
        '-131': BigInteger;
        '-130': BigInteger;
        '-129': BigInteger;
        '-128': BigInteger;
        '-127': BigInteger;
        '-126': BigInteger;
        '-125': BigInteger;
        '-124': BigInteger;
        '-123': BigInteger;
        '-122': BigInteger;
        '-121': BigInteger;
        '-120': BigInteger;
        '-119': BigInteger;
        '-118': BigInteger;
        '-117': BigInteger;
        '-116': BigInteger;
        '-115': BigInteger;
        '-114': BigInteger;
        '-113': BigInteger;
        '-112': BigInteger;
        '-111': BigInteger;
        '-110': BigInteger;
        '-109': BigInteger;
        '-108': BigInteger;
        '-107': BigInteger;
        '-106': BigInteger;
        '-105': BigInteger;
        '-104': BigInteger;
        '-103': BigInteger;
        '-102': BigInteger;
        '-101': BigInteger;
        '-100': BigInteger;
        '-99': BigInteger;
        '-98': BigInteger;
        '-97': BigInteger;
        '-96': BigInteger;
        '-95': BigInteger;
        '-94': BigInteger;
        '-93': BigInteger;
        '-92': BigInteger;
        '-91': BigInteger;
        '-90': BigInteger;
        '-89': BigInteger;
        '-88': BigInteger;
        '-87': BigInteger;
        '-86': BigInteger;
        '-85': BigInteger;
        '-84': BigInteger;
        '-83': BigInteger;
        '-82': BigInteger;
        '-81': BigInteger;
        '-80': BigInteger;
        '-79': BigInteger;
        '-78': BigInteger;
        '-77': BigInteger;
        '-76': BigInteger;
        '-75': BigInteger;
        '-74': BigInteger;
        '-73': BigInteger;
        '-72': BigInteger;
        '-71': BigInteger;
        '-70': BigInteger;
        '-69': BigInteger;
        '-68': BigInteger;
        '-67': BigInteger;
        '-66': BigInteger;
        '-65': BigInteger;
        '-64': BigInteger;
        '-63': BigInteger;
        '-62': BigInteger;
        '-61': BigInteger;
        '-60': BigInteger;
        '-59': BigInteger;
        '-58': BigInteger;
        '-57': BigInteger;
        '-56': BigInteger;
        '-55': BigInteger;
        '-54': BigInteger;
        '-53': BigInteger;
        '-52': BigInteger;
        '-51': BigInteger;
        '-50': BigInteger;
        '-49': BigInteger;
        '-48': BigInteger;
        '-47': BigInteger;
        '-46': BigInteger;
        '-45': BigInteger;
        '-44': BigInteger;
        '-43': BigInteger;
        '-42': BigInteger;
        '-41': BigInteger;
        '-40': BigInteger;
        '-39': BigInteger;
        '-38': BigInteger;
        '-37': BigInteger;
        '-36': BigInteger;
        '-35': BigInteger;
        '-34': BigInteger;
        '-33': BigInteger;
        '-32': BigInteger;
        '-31': BigInteger;
        '-30': BigInteger;
        '-29': BigInteger;
        '-28': BigInteger;
        '-27': BigInteger;
        '-26': BigInteger;
        '-25': BigInteger;
        '-24': BigInteger;
        '-23': BigInteger;
        '-22': BigInteger;
        '-21': BigInteger;
        '-20': BigInteger;
        '-19': BigInteger;
        '-18': BigInteger;
        '-17': BigInteger;
        '-16': BigInteger;
        '-15': BigInteger;
        '-14': BigInteger;
        '-13': BigInteger;
        '-12': BigInteger;
        '-11': BigInteger;
        '-10': BigInteger;
        '-9': BigInteger;
        '-8': BigInteger;
        '-7': BigInteger;
        '-6': BigInteger;
        '-5': BigInteger;
        '-4': BigInteger;
        '-3': BigInteger;
        '-2': BigInteger;
        '-1': BigInteger;
        '0': BigInteger;
        '1': BigInteger;
        '2': BigInteger;
        '3': BigInteger;
        '4': BigInteger;
        '5': BigInteger;
        '6': BigInteger;
        '7': BigInteger;
        '8': BigInteger;
        '9': BigInteger;
        '10': BigInteger;
        '11': BigInteger;
        '12': BigInteger;
        '13': BigInteger;
        '14': BigInteger;
        '15': BigInteger;
        '16': BigInteger;
        '17': BigInteger;
        '18': BigInteger;
        '19': BigInteger;
        '20': BigInteger;
        '21': BigInteger;
        '22': BigInteger;
        '23': BigInteger;
        '24': BigInteger;
        '25': BigInteger;
        '26': BigInteger;
        '27': BigInteger;
        '28': BigInteger;
        '29': BigInteger;
        '30': BigInteger;
        '31': BigInteger;
        '32': BigInteger;
        '33': BigInteger;
        '34': BigInteger;
        '35': BigInteger;
        '36': BigInteger;
        '37': BigInteger;
        '38': BigInteger;
        '39': BigInteger;
        '40': BigInteger;
        '41': BigInteger;
        '42': BigInteger;
        '43': BigInteger;
        '44': BigInteger;
        '45': BigInteger;
        '46': BigInteger;
        '47': BigInteger;
        '48': BigInteger;
        '49': BigInteger;
        '50': BigInteger;
        '51': BigInteger;
        '52': BigInteger;
        '53': BigInteger;
        '54': BigInteger;
        '55': BigInteger;
        '56': BigInteger;
        '57': BigInteger;
        '58': BigInteger;
        '59': BigInteger;
        '60': BigInteger;
        '61': BigInteger;
        '62': BigInteger;
        '63': BigInteger;
        '64': BigInteger;
        '65': BigInteger;
        '66': BigInteger;
        '67': BigInteger;
        '68': BigInteger;
        '69': BigInteger;
        '70': BigInteger;
        '71': BigInteger;
        '72': BigInteger;
        '73': BigInteger;
        '74': BigInteger;
        '75': BigInteger;
        '76': BigInteger;
        '77': BigInteger;
        '78': BigInteger;
        '79': BigInteger;
        '80': BigInteger;
        '81': BigInteger;
        '82': BigInteger;
        '83': BigInteger;
        '84': BigInteger;
        '85': BigInteger;
        '86': BigInteger;
        '87': BigInteger;
        '88': BigInteger;
        '89': BigInteger;
        '90': BigInteger;
        '91': BigInteger;
        '92': BigInteger;
        '93': BigInteger;
        '94': BigInteger;
        '95': BigInteger;
        '96': BigInteger;
        '97': BigInteger;
        '98': BigInteger;
        '99': BigInteger;
        '100': BigInteger;
        '101': BigInteger;
        '102': BigInteger;
        '103': BigInteger;
        '104': BigInteger;
        '105': BigInteger;
        '106': BigInteger;
        '107': BigInteger;
        '108': BigInteger;
        '109': BigInteger;
        '110': BigInteger;
        '111': BigInteger;
        '112': BigInteger;
        '113': BigInteger;
        '114': BigInteger;
        '115': BigInteger;
        '116': BigInteger;
        '117': BigInteger;
        '118': BigInteger;
        '119': BigInteger;
        '120': BigInteger;
        '121': BigInteger;
        '122': BigInteger;
        '123': BigInteger;
        '124': BigInteger;
        '125': BigInteger;
        '126': BigInteger;
        '127': BigInteger;
        '128': BigInteger;
        '129': BigInteger;
        '130': BigInteger;
        '131': BigInteger;
        '132': BigInteger;
        '133': BigInteger;
        '134': BigInteger;
        '135': BigInteger;
        '136': BigInteger;
        '137': BigInteger;
        '138': BigInteger;
        '139': BigInteger;
        '140': BigInteger;
        '141': BigInteger;
        '142': BigInteger;
        '143': BigInteger;
        '144': BigInteger;
        '145': BigInteger;
        '146': BigInteger;
        '147': BigInteger;
        '148': BigInteger;
        '149': BigInteger;
        '150': BigInteger;
        '151': BigInteger;
        '152': BigInteger;
        '153': BigInteger;
        '154': BigInteger;
        '155': BigInteger;
        '156': BigInteger;
        '157': BigInteger;
        '158': BigInteger;
        '159': BigInteger;
        '160': BigInteger;
        '161': BigInteger;
        '162': BigInteger;
        '163': BigInteger;
        '164': BigInteger;
        '165': BigInteger;
        '166': BigInteger;
        '167': BigInteger;
        '168': BigInteger;
        '169': BigInteger;
        '170': BigInteger;
        '171': BigInteger;
        '172': BigInteger;
        '173': BigInteger;
        '174': BigInteger;
        '175': BigInteger;
        '176': BigInteger;
        '177': BigInteger;
        '178': BigInteger;
        '179': BigInteger;
        '180': BigInteger;
        '181': BigInteger;
        '182': BigInteger;
        '183': BigInteger;
        '184': BigInteger;
        '185': BigInteger;
        '186': BigInteger;
        '187': BigInteger;
        '188': BigInteger;
        '189': BigInteger;
        '190': BigInteger;
        '191': BigInteger;
        '192': BigInteger;
        '193': BigInteger;
        '194': BigInteger;
        '195': BigInteger;
        '196': BigInteger;
        '197': BigInteger;
        '198': BigInteger;
        '199': BigInteger;
        '200': BigInteger;
        '201': BigInteger;
        '202': BigInteger;
        '203': BigInteger;
        '204': BigInteger;
        '205': BigInteger;
        '206': BigInteger;
        '207': BigInteger;
        '208': BigInteger;
        '209': BigInteger;
        '210': BigInteger;
        '211': BigInteger;
        '212': BigInteger;
        '213': BigInteger;
        '214': BigInteger;
        '215': BigInteger;
        '216': BigInteger;
        '217': BigInteger;
        '218': BigInteger;
        '219': BigInteger;
        '220': BigInteger;
        '221': BigInteger;
        '222': BigInteger;
        '223': BigInteger;
        '224': BigInteger;
        '225': BigInteger;
        '226': BigInteger;
        '227': BigInteger;
        '228': BigInteger;
        '229': BigInteger;
        '230': BigInteger;
        '231': BigInteger;
        '232': BigInteger;
        '233': BigInteger;
        '234': BigInteger;
        '235': BigInteger;
        '236': BigInteger;
        '237': BigInteger;
        '238': BigInteger;
        '239': BigInteger;
        '240': BigInteger;
        '241': BigInteger;
        '242': BigInteger;
        '243': BigInteger;
        '244': BigInteger;
        '245': BigInteger;
        '246': BigInteger;
        '247': BigInteger;
        '248': BigInteger;
        '249': BigInteger;
        '250': BigInteger;
        '251': BigInteger;
        '252': BigInteger;
        '253': BigInteger;
        '254': BigInteger;
        '255': BigInteger;
        '256': BigInteger;
        '257': BigInteger;
        '258': BigInteger;
        '259': BigInteger;
        '260': BigInteger;
        '261': BigInteger;
        '262': BigInteger;
        '263': BigInteger;
        '264': BigInteger;
        '265': BigInteger;
        '266': BigInteger;
        '267': BigInteger;
        '268': BigInteger;
        '269': BigInteger;
        '270': BigInteger;
        '271': BigInteger;
        '272': BigInteger;
        '273': BigInteger;
        '274': BigInteger;
        '275': BigInteger;
        '276': BigInteger;
        '277': BigInteger;
        '278': BigInteger;
        '279': BigInteger;
        '280': BigInteger;
        '281': BigInteger;
        '282': BigInteger;
        '283': BigInteger;
        '284': BigInteger;
        '285': BigInteger;
        '286': BigInteger;
        '287': BigInteger;
        '288': BigInteger;
        '289': BigInteger;
        '290': BigInteger;
        '291': BigInteger;
        '292': BigInteger;
        '293': BigInteger;
        '294': BigInteger;
        '295': BigInteger;
        '296': BigInteger;
        '297': BigInteger;
        '298': BigInteger;
        '299': BigInteger;
        '300': BigInteger;
        '301': BigInteger;
        '302': BigInteger;
        '303': BigInteger;
        '304': BigInteger;
        '305': BigInteger;
        '306': BigInteger;
        '307': BigInteger;
        '308': BigInteger;
        '309': BigInteger;
        '310': BigInteger;
        '311': BigInteger;
        '312': BigInteger;
        '313': BigInteger;
        '314': BigInteger;
        '315': BigInteger;
        '316': BigInteger;
        '317': BigInteger;
        '318': BigInteger;
        '319': BigInteger;
        '320': BigInteger;
        '321': BigInteger;
        '322': BigInteger;
        '323': BigInteger;
        '324': BigInteger;
        '325': BigInteger;
        '326': BigInteger;
        '327': BigInteger;
        '328': BigInteger;
        '329': BigInteger;
        '330': BigInteger;
        '331': BigInteger;
        '332': BigInteger;
        '333': BigInteger;
        '334': BigInteger;
        '335': BigInteger;
        '336': BigInteger;
        '337': BigInteger;
        '338': BigInteger;
        '339': BigInteger;
        '340': BigInteger;
        '341': BigInteger;
        '342': BigInteger;
        '343': BigInteger;
        '344': BigInteger;
        '345': BigInteger;
        '346': BigInteger;
        '347': BigInteger;
        '348': BigInteger;
        '349': BigInteger;
        '350': BigInteger;
        '351': BigInteger;
        '352': BigInteger;
        '353': BigInteger;
        '354': BigInteger;
        '355': BigInteger;
        '356': BigInteger;
        '357': BigInteger;
        '358': BigInteger;
        '359': BigInteger;
        '360': BigInteger;
        '361': BigInteger;
        '362': BigInteger;
        '363': BigInteger;
        '364': BigInteger;
        '365': BigInteger;
        '366': BigInteger;
        '367': BigInteger;
        '368': BigInteger;
        '369': BigInteger;
        '370': BigInteger;
        '371': BigInteger;
        '372': BigInteger;
        '373': BigInteger;
        '374': BigInteger;
        '375': BigInteger;
        '376': BigInteger;
        '377': BigInteger;
        '378': BigInteger;
        '379': BigInteger;
        '380': BigInteger;
        '381': BigInteger;
        '382': BigInteger;
        '383': BigInteger;
        '384': BigInteger;
        '385': BigInteger;
        '386': BigInteger;
        '387': BigInteger;
        '388': BigInteger;
        '389': BigInteger;
        '390': BigInteger;
        '391': BigInteger;
        '392': BigInteger;
        '393': BigInteger;
        '394': BigInteger;
        '395': BigInteger;
        '396': BigInteger;
        '397': BigInteger;
        '398': BigInteger;
        '399': BigInteger;
        '400': BigInteger;
        '401': BigInteger;
        '402': BigInteger;
        '403': BigInteger;
        '404': BigInteger;
        '405': BigInteger;
        '406': BigInteger;
        '407': BigInteger;
        '408': BigInteger;
        '409': BigInteger;
        '410': BigInteger;
        '411': BigInteger;
        '412': BigInteger;
        '413': BigInteger;
        '414': BigInteger;
        '415': BigInteger;
        '416': BigInteger;
        '417': BigInteger;
        '418': BigInteger;
        '419': BigInteger;
        '420': BigInteger;
        '421': BigInteger;
        '422': BigInteger;
        '423': BigInteger;
        '424': BigInteger;
        '425': BigInteger;
        '426': BigInteger;
        '427': BigInteger;
        '428': BigInteger;
        '429': BigInteger;
        '430': BigInteger;
        '431': BigInteger;
        '432': BigInteger;
        '433': BigInteger;
        '434': BigInteger;
        '435': BigInteger;
        '436': BigInteger;
        '437': BigInteger;
        '438': BigInteger;
        '439': BigInteger;
        '440': BigInteger;
        '441': BigInteger;
        '442': BigInteger;
        '443': BigInteger;
        '444': BigInteger;
        '445': BigInteger;
        '446': BigInteger;
        '447': BigInteger;
        '448': BigInteger;
        '449': BigInteger;
        '450': BigInteger;
        '451': BigInteger;
        '452': BigInteger;
        '453': BigInteger;
        '454': BigInteger;
        '455': BigInteger;
        '456': BigInteger;
        '457': BigInteger;
        '458': BigInteger;
        '459': BigInteger;
        '460': BigInteger;
        '461': BigInteger;
        '462': BigInteger;
        '463': BigInteger;
        '464': BigInteger;
        '465': BigInteger;
        '466': BigInteger;
        '467': BigInteger;
        '468': BigInteger;
        '469': BigInteger;
        '470': BigInteger;
        '471': BigInteger;
        '472': BigInteger;
        '473': BigInteger;
        '474': BigInteger;
        '475': BigInteger;
        '476': BigInteger;
        '477': BigInteger;
        '478': BigInteger;
        '479': BigInteger;
        '480': BigInteger;
        '481': BigInteger;
        '482': BigInteger;
        '483': BigInteger;
        '484': BigInteger;
        '485': BigInteger;
        '486': BigInteger;
        '487': BigInteger;
        '488': BigInteger;
        '489': BigInteger;
        '490': BigInteger;
        '491': BigInteger;
        '492': BigInteger;
        '493': BigInteger;
        '494': BigInteger;
        '495': BigInteger;
        '496': BigInteger;
        '497': BigInteger;
        '498': BigInteger;
        '499': BigInteger;
        '500': BigInteger;
        '501': BigInteger;
        '502': BigInteger;
        '503': BigInteger;
        '504': BigInteger;
        '505': BigInteger;
        '506': BigInteger;
        '507': BigInteger;
        '508': BigInteger;
        '509': BigInteger;
        '510': BigInteger;
        '511': BigInteger;
        '512': BigInteger;
        '513': BigInteger;
        '514': BigInteger;
        '515': BigInteger;
        '516': BigInteger;
        '517': BigInteger;
        '518': BigInteger;
        '519': BigInteger;
        '520': BigInteger;
        '521': BigInteger;
        '522': BigInteger;
        '523': BigInteger;
        '524': BigInteger;
        '525': BigInteger;
        '526': BigInteger;
        '527': BigInteger;
        '528': BigInteger;
        '529': BigInteger;
        '530': BigInteger;
        '531': BigInteger;
        '532': BigInteger;
        '533': BigInteger;
        '534': BigInteger;
        '535': BigInteger;
        '536': BigInteger;
        '537': BigInteger;
        '538': BigInteger;
        '539': BigInteger;
        '540': BigInteger;
        '541': BigInteger;
        '542': BigInteger;
        '543': BigInteger;
        '544': BigInteger;
        '545': BigInteger;
        '546': BigInteger;
        '547': BigInteger;
        '548': BigInteger;
        '549': BigInteger;
        '550': BigInteger;
        '551': BigInteger;
        '552': BigInteger;
        '553': BigInteger;
        '554': BigInteger;
        '555': BigInteger;
        '556': BigInteger;
        '557': BigInteger;
        '558': BigInteger;
        '559': BigInteger;
        '560': BigInteger;
        '561': BigInteger;
        '562': BigInteger;
        '563': BigInteger;
        '564': BigInteger;
        '565': BigInteger;
        '566': BigInteger;
        '567': BigInteger;
        '568': BigInteger;
        '569': BigInteger;
        '570': BigInteger;
        '571': BigInteger;
        '572': BigInteger;
        '573': BigInteger;
        '574': BigInteger;
        '575': BigInteger;
        '576': BigInteger;
        '577': BigInteger;
        '578': BigInteger;
        '579': BigInteger;
        '580': BigInteger;
        '581': BigInteger;
        '582': BigInteger;
        '583': BigInteger;
        '584': BigInteger;
        '585': BigInteger;
        '586': BigInteger;
        '587': BigInteger;
        '588': BigInteger;
        '589': BigInteger;
        '590': BigInteger;
        '591': BigInteger;
        '592': BigInteger;
        '593': BigInteger;
        '594': BigInteger;
        '595': BigInteger;
        '596': BigInteger;
        '597': BigInteger;
        '598': BigInteger;
        '599': BigInteger;
        '600': BigInteger;
        '601': BigInteger;
        '602': BigInteger;
        '603': BigInteger;
        '604': BigInteger;
        '605': BigInteger;
        '606': BigInteger;
        '607': BigInteger;
        '608': BigInteger;
        '609': BigInteger;
        '610': BigInteger;
        '611': BigInteger;
        '612': BigInteger;
        '613': BigInteger;
        '614': BigInteger;
        '615': BigInteger;
        '616': BigInteger;
        '617': BigInteger;
        '618': BigInteger;
        '619': BigInteger;
        '620': BigInteger;
        '621': BigInteger;
        '622': BigInteger;
        '623': BigInteger;
        '624': BigInteger;
        '625': BigInteger;
        '626': BigInteger;
        '627': BigInteger;
        '628': BigInteger;
        '629': BigInteger;
        '630': BigInteger;
        '631': BigInteger;
        '632': BigInteger;
        '633': BigInteger;
        '634': BigInteger;
        '635': BigInteger;
        '636': BigInteger;
        '637': BigInteger;
        '638': BigInteger;
        '639': BigInteger;
        '640': BigInteger;
        '641': BigInteger;
        '642': BigInteger;
        '643': BigInteger;
        '644': BigInteger;
        '645': BigInteger;
        '646': BigInteger;
        '647': BigInteger;
        '648': BigInteger;
        '649': BigInteger;
        '650': BigInteger;
        '651': BigInteger;
        '652': BigInteger;
        '653': BigInteger;
        '654': BigInteger;
        '655': BigInteger;
        '656': BigInteger;
        '657': BigInteger;
        '658': BigInteger;
        '659': BigInteger;
        '660': BigInteger;
        '661': BigInteger;
        '662': BigInteger;
        '663': BigInteger;
        '664': BigInteger;
        '665': BigInteger;
        '666': BigInteger;
        '667': BigInteger;
        '668': BigInteger;
        '669': BigInteger;
        '670': BigInteger;
        '671': BigInteger;
        '672': BigInteger;
        '673': BigInteger;
        '674': BigInteger;
        '675': BigInteger;
        '676': BigInteger;
        '677': BigInteger;
        '678': BigInteger;
        '679': BigInteger;
        '680': BigInteger;
        '681': BigInteger;
        '682': BigInteger;
        '683': BigInteger;
        '684': BigInteger;
        '685': BigInteger;
        '686': BigInteger;
        '687': BigInteger;
        '688': BigInteger;
        '689': BigInteger;
        '690': BigInteger;
        '691': BigInteger;
        '692': BigInteger;
        '693': BigInteger;
        '694': BigInteger;
        '695': BigInteger;
        '696': BigInteger;
        '697': BigInteger;
        '698': BigInteger;
        '699': BigInteger;
        '700': BigInteger;
        '701': BigInteger;
        '702': BigInteger;
        '703': BigInteger;
        '704': BigInteger;
        '705': BigInteger;
        '706': BigInteger;
        '707': BigInteger;
        '708': BigInteger;
        '709': BigInteger;
        '710': BigInteger;
        '711': BigInteger;
        '712': BigInteger;
        '713': BigInteger;
        '714': BigInteger;
        '715': BigInteger;
        '716': BigInteger;
        '717': BigInteger;
        '718': BigInteger;
        '719': BigInteger;
        '720': BigInteger;
        '721': BigInteger;
        '722': BigInteger;
        '723': BigInteger;
        '724': BigInteger;
        '725': BigInteger;
        '726': BigInteger;
        '727': BigInteger;
        '728': BigInteger;
        '729': BigInteger;
        '730': BigInteger;
        '731': BigInteger;
        '732': BigInteger;
        '733': BigInteger;
        '734': BigInteger;
        '735': BigInteger;
        '736': BigInteger;
        '737': BigInteger;
        '738': BigInteger;
        '739': BigInteger;
        '740': BigInteger;
        '741': BigInteger;
        '742': BigInteger;
        '743': BigInteger;
        '744': BigInteger;
        '745': BigInteger;
        '746': BigInteger;
        '747': BigInteger;
        '748': BigInteger;
        '749': BigInteger;
        '750': BigInteger;
        '751': BigInteger;
        '752': BigInteger;
        '753': BigInteger;
        '754': BigInteger;
        '755': BigInteger;
        '756': BigInteger;
        '757': BigInteger;
        '758': BigInteger;
        '759': BigInteger;
        '760': BigInteger;
        '761': BigInteger;
        '762': BigInteger;
        '763': BigInteger;
        '764': BigInteger;
        '765': BigInteger;
        '766': BigInteger;
        '767': BigInteger;
        '768': BigInteger;
        '769': BigInteger;
        '770': BigInteger;
        '771': BigInteger;
        '772': BigInteger;
        '773': BigInteger;
        '774': BigInteger;
        '775': BigInteger;
        '776': BigInteger;
        '777': BigInteger;
        '778': BigInteger;
        '779': BigInteger;
        '780': BigInteger;
        '781': BigInteger;
        '782': BigInteger;
        '783': BigInteger;
        '784': BigInteger;
        '785': BigInteger;
        '786': BigInteger;
        '787': BigInteger;
        '788': BigInteger;
        '789': BigInteger;
        '790': BigInteger;
        '791': BigInteger;
        '792': BigInteger;
        '793': BigInteger;
        '794': BigInteger;
        '795': BigInteger;
        '796': BigInteger;
        '797': BigInteger;
        '798': BigInteger;
        '799': BigInteger;
        '800': BigInteger;
        '801': BigInteger;
        '802': BigInteger;
        '803': BigInteger;
        '804': BigInteger;
        '805': BigInteger;
        '806': BigInteger;
        '807': BigInteger;
        '808': BigInteger;
        '809': BigInteger;
        '810': BigInteger;
        '811': BigInteger;
        '812': BigInteger;
        '813': BigInteger;
        '814': BigInteger;
        '815': BigInteger;
        '816': BigInteger;
        '817': BigInteger;
        '818': BigInteger;
        '819': BigInteger;
        '820': BigInteger;
        '821': BigInteger;
        '822': BigInteger;
        '823': BigInteger;
        '824': BigInteger;
        '825': BigInteger;
        '826': BigInteger;
        '827': BigInteger;
        '828': BigInteger;
        '829': BigInteger;
        '830': BigInteger;
        '831': BigInteger;
        '832': BigInteger;
        '833': BigInteger;
        '834': BigInteger;
        '835': BigInteger;
        '836': BigInteger;
        '837': BigInteger;
        '838': BigInteger;
        '839': BigInteger;
        '840': BigInteger;
        '841': BigInteger;
        '842': BigInteger;
        '843': BigInteger;
        '844': BigInteger;
        '845': BigInteger;
        '846': BigInteger;
        '847': BigInteger;
        '848': BigInteger;
        '849': BigInteger;
        '850': BigInteger;
        '851': BigInteger;
        '852': BigInteger;
        '853': BigInteger;
        '854': BigInteger;
        '855': BigInteger;
        '856': BigInteger;
        '857': BigInteger;
        '858': BigInteger;
        '859': BigInteger;
        '860': BigInteger;
        '861': BigInteger;
        '862': BigInteger;
        '863': BigInteger;
        '864': BigInteger;
        '865': BigInteger;
        '866': BigInteger;
        '867': BigInteger;
        '868': BigInteger;
        '869': BigInteger;
        '870': BigInteger;
        '871': BigInteger;
        '872': BigInteger;
        '873': BigInteger;
        '874': BigInteger;
        '875': BigInteger;
        '876': BigInteger;
        '877': BigInteger;
        '878': BigInteger;
        '879': BigInteger;
        '880': BigInteger;
        '881': BigInteger;
        '882': BigInteger;
        '883': BigInteger;
        '884': BigInteger;
        '885': BigInteger;
        '886': BigInteger;
        '887': BigInteger;
        '888': BigInteger;
        '889': BigInteger;
        '890': BigInteger;
        '891': BigInteger;
        '892': BigInteger;
        '893': BigInteger;
        '894': BigInteger;
        '895': BigInteger;
        '896': BigInteger;
        '897': BigInteger;
        '898': BigInteger;
        '899': BigInteger;
        '900': BigInteger;
        '901': BigInteger;
        '902': BigInteger;
        '903': BigInteger;
        '904': BigInteger;
        '905': BigInteger;
        '906': BigInteger;
        '907': BigInteger;
        '908': BigInteger;
        '909': BigInteger;
        '910': BigInteger;
        '911': BigInteger;
        '912': BigInteger;
        '913': BigInteger;
        '914': BigInteger;
        '915': BigInteger;
        '916': BigInteger;
        '917': BigInteger;
        '918': BigInteger;
        '919': BigInteger;
        '920': BigInteger;
        '921': BigInteger;
        '922': BigInteger;
        '923': BigInteger;
        '924': BigInteger;
        '925': BigInteger;
        '926': BigInteger;
        '927': BigInteger;
        '928': BigInteger;
        '929': BigInteger;
        '930': BigInteger;
        '931': BigInteger;
        '932': BigInteger;
        '933': BigInteger;
        '934': BigInteger;
        '935': BigInteger;
        '936': BigInteger;
        '937': BigInteger;
        '938': BigInteger;
        '939': BigInteger;
        '940': BigInteger;
        '941': BigInteger;
        '942': BigInteger;
        '943': BigInteger;
        '944': BigInteger;
        '945': BigInteger;
        '946': BigInteger;
        '947': BigInteger;
        '948': BigInteger;
        '949': BigInteger;
        '950': BigInteger;
        '951': BigInteger;
        '952': BigInteger;
        '953': BigInteger;
        '954': BigInteger;
        '955': BigInteger;
        '956': BigInteger;
        '957': BigInteger;
        '958': BigInteger;
        '959': BigInteger;
        '960': BigInteger;
        '961': BigInteger;
        '962': BigInteger;
        '963': BigInteger;
        '964': BigInteger;
        '965': BigInteger;
        '966': BigInteger;
        '967': BigInteger;
        '968': BigInteger;
        '969': BigInteger;
        '970': BigInteger;
        '971': BigInteger;
        '972': BigInteger;
        '973': BigInteger;
        '974': BigInteger;
        '975': BigInteger;
        '976': BigInteger;
        '977': BigInteger;
        '978': BigInteger;
        '979': BigInteger;
        '980': BigInteger;
        '981': BigInteger;
        '982': BigInteger;
        '983': BigInteger;
        '984': BigInteger;
        '985': BigInteger;
        '986': BigInteger;
        '987': BigInteger;
        '988': BigInteger;
        '989': BigInteger;
        '990': BigInteger;
        '991': BigInteger;
        '992': BigInteger;
        '993': BigInteger;
        '994': BigInteger;
        '995': BigInteger;
        '996': BigInteger;
        '997': BigInteger;
        '998': BigInteger;
        '999': BigInteger;
    }

    interface BaseArray {
        value: number[],
        isNegative: boolean
    }
}
