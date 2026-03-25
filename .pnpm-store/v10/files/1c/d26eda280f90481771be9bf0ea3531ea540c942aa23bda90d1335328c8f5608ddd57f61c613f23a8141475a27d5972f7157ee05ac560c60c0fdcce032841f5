# Cuid2

Secure, collision-resistant ids optimized for horizontal scaling and performance. Next generation UUIDs.

Need unique ids in your app? Forget UUIDs and GUIDs which often collide in large apps. Use Cuid2, instead.

**Cuid2 is:**

* **Secure:** It's not feasible to guess the next id, existing valid ids, or learn anything about the referenced data from the id. Cuid2 uses multiple, independent entropy sources and hashes them with a security-audited, NIST-standard cryptographically secure hashing algorithm (Sha3).
* **Collision resistant:** It's extremely unlikely to generate the same id twice (by default, you'd need to generate roughly 4,000,000,000,000,000,000 ids ([`sqrt(36^(24-1) * 26) = 4.0268498e+18`](https://en.wikipedia.org/wiki/Birthday_problem#Square_approximation)) to reach 50% chance of collision.)
* **Horizontally scalable:** Generate ids on multiple machines without coordination.
* **Offline-compatible:** Generate ids without a network connection.
* **URL and name-friendly:** No special characters.
* **Fast and convenient:** No async operations. Won't introduce user-noticeable delays. Less than 5k, gzipped.
* **But not *too fast*:** If you can hash too quickly you can launch parallel attacks to find duplicates or break entropy-hiding. For unique ids, the fastest runner loses the security race.


**Cuid2 is not good for:**

* Sequential ids (see the [note on K-sortable ids](https://github.com/paralleldrive/cuid2#note-on-k-sortablesequentialmonotonically-increasing-ids), below)
* High performance tight loops, such as render loops (if you don't need cross-host unique ids or security, consider a simple counter for this use-case, or try [Ulid](https://github.com/ulid/javascript) or [NanoId](https://github.com/ai/nanoid)).


## Getting Started

```
npm install --save @paralleldrive/cuid2
```

Or

```
yarn add @paralleldrive/cuid2
```

```js
import { createId } from '@paralleldrive/cuid2';

const ids = [
  createId(), // 'tz4a98xxat96iws9zmbrgj3a'
  createId(), // 'pfh0haxfpzowht3oi213cqos'
  createId(), // 'nc6bzmkmd014706rfda898to'
];
```

Using Jest? Jump to [Using with Jest](#using-in-jest).

### Configuration

```js
import { init } from '@paralleldrive/cuid2';

// The init function returns a custom createId function with the specified
// configuration. All configuration properties are optional.
const createId = init({
  // A custom random function with the same API as Math.random.
  // You can use this to pass a cryptographically secure random function.
  random: Math.random,
  // the length of the id
  length: 10,
  // A custom fingerprint for the host environment. This is used to help
  // prevent collisions when generating ids in a distributed system.
  fingerprint: 'a-custom-host-fingerprint',
});

console.log(
  createId(), // wjfazn7qnd
  createId(), // cerhuy9499
  createId(), // itp2u4ozr4
);
```


### Validation

```js
import { createId, isCuid } from '@paralleldrive/cuid2';


console.log(
  isCuid(createId()), // true
  isCuid('not a cuid'), // false
);
```


## Trusted By

* [Greenruhm](https://twitter.com/greenruhm)
* [Typebot](https://typebot.io/)
* [Submit my project](https://github.com/paralleldrive/cuid2/issues/new?title=Social+proof)

## Why?

Ids should be secure by default for the same reason that browser sessions should be secure by default. There are too many things that can go wrong when they're not, and insecure ids can cause problems in unexpected ways, including [unauthorized user](https://www.intruder.io/research/in-guid-we-trust) [account access](https://infosecwriteups.com/bugbounty-how-i-was-able-to-compromise-any-user-account-via-reset-password-functionality-a11bb5f863b3), [unauthorized access to user data](https://infosecwriteups.com/how-this-easy-vulnerability-resulted-in-a-20-000-bug-bounty-from-gitlab-d9dc9312c10a), and accidental leaks of user's personal data which can lead to catastrophic effects, even in innocent-sounding applications like fitness run trackers (see the [2018 Strava Pentagon breach](https://www.engadget.com/2018-02-02-strava-s-fitness-heatmaps-are-a-potential-catastrophe.html) and [PleaseRobMe](https://pleaserobme.com/why)).

Not all security measures should be considered equal. For example, it's not a good idea to trust your browser's "Cryptographically Secure" Psuedo Random Number Generator (CSPRNG) (used in tools like `uuid` and `nanoid`). For example, there may be [bugs in browser CSPRNGs](https://bugs.chromium.org/p/chromium/issues/detail?id=552749). For many years, Chromium's `Math.random()` [wasn't very random at all](https://thenextweb.com/news/google-chromes-javascript-engine-finally-returns-actual-random-numbers). Cuid was created to solve the issue of untrustworthy entropy in id generators that led to frequent id collisions and related problems in production applications. Instead of trusting a single source of entropy, Cuid2 combines several sources of entropy to provide stronger security and collision-resistance guarantees than are available in other solutions.

Modern web applications have different requirements than applications written in the early days of GUID (globally unique identifiers) and UUIDs (universally unique identifiers). In particular, Cuid2 aims to provide stronger uniqueness guarantees than any existing GUID or UUID implementation and protect against leaking any information about the data being referenced, or the system that generated the id.

Cuid2 is the next generation of Cuid, which has been used in thousands of applications for over a decade with no confirmed collision reports. The changes in Cuid2 are significant and could potentially disrupt the many projects that rely on Cuid, so we decided to create a replacement library and id standard, instead. Cuid is now deprecated in favor of Cuid2.

Entropy is a measure of the total information in a system. In the context of unique ids, a higher entropy will lead to fewer collisions, and can also make it more difficult for an attacker to guess a valid id.

Cuid2 is made up of the following entropy sources:

* An initial letter to make the id a usable identifier in JavaScript and HTML/CSS
* The current system time
* Pseudorandom values
* A session counter
* A host fingerprint

The string is Base36 encoded, which means it contains only lowercase letters and the numbers: 0 - 9, with no special symbols.


### Horizontal scalability

Today's applications don't run on any single machine.

Applications might need to support online / offline capability, which means we need a way for clients on different hosts to generate ids that won't collide with ids generated by other hosts -- even if they're not connected to the network.

Most pseudo-random algorithms use time in ms as a random seed. Random IDs lack sufficient entropy when running in separate processes (such as cloned virtual machines or client browsers) to guarantee against collisions. Application developers report v4 UUID collisions causing problems in their applications when the ID generation is distributed between lots of machines such that lots of IDs are generated in the same millisecond.

Each new client exponentially increases the chance of collision in the same way that each new character in a random string exponentially reduces the chance of collision. Successful apps scale at hundreds or thousands of new clients per day, so fighting the lack of entropy by adding random characters is a recipe for ridiculously long identifiers.

Because of the nature of this problem, it's possible to build an app from the ground up and scale it to a million users before this problem is detected. By the time you notice the problem (when your peak hour use requires dozens of ids to be created per ms), if your db doesn't have unique constraints on the id because you thought your guids were safe, you're in a world of hurt. Your users start to see data that doesn't belong to them because the db just returns the first ID match it finds.

Alternatively, you've played it safe and you only let your database create ids. Writes only happen on a master database, and load is spread out over read replicas. But with this kind of strain, you have to start scaling your database writes horizontally, too, and suddenly your application starts to crawl (if the db is smart enough to guarantee unique ids between write hosts), or you start getting id collisions between different db hosts, so your write hosts don't agree about which ids represent which data.


### Performance

Id generation should be fast enough that humans won't notice a delay, but too slow to feasibly brute force (even in parallel). That means no waiting around for asynchronous entropy pool requests, or cross-process/cross-network communication. Performance slows to impracticality in the browser. All sources of entropy need to be fast enough for synchronous access.

Even worse, when the database is the only guarantee that ids are unique, that means that clients are forced to send incomplete records to the database, and wait for a network round-trip before they can use the ids in any algorithm. Forget about fast client performance. It simply isn't possible.

That situation has caused some clients to create ids that are only usable in a single client session (such as an in-memory counter). When the database returns the real id, the client has to do some juggling logic to swap out the id being used, adding complexity to the client implementation code.

If client side ID generation were stronger, the chances of collision would be much smaller, and the client could send complete records to the db for insertion without waiting for a full round-trip request to finish before using the ID.


#### Tiny

Page loads need to be FAST, and that means we can't waste a lot of JavaScript on a complex algorithm. Cuid2 is tiny. This is especially important for thick-client JavaScript applications.


### Secure

Client-visible ids often need to have sufficient random data and entropy to make it practically impossible to try to guess valid IDs based on an existing, known id. That makes simple sequential ids unusable in the context of client-side generated database keys. Additionally, using V4 UUIDs is also not safe, because there are known attacks on several id generating algorithms that a sophisticated attacker can use to predict next ids. Cuid2 has been audited by security experts and artificial intelligence, and is considered safe to use for use-cases like secret sharing links.


### Portable

Most stronger forms of the UUID / GUID algorithms require access to OS services that are not available in browsers, meaning that they are impossible to implement as specified. Further, our id standard needs to be portable to many languages (the original cuid has 22 different language implementations).

#### Ports

* [Cuid2 for Clojure](https://github.com/hden/cuid2) - [Haokang Den](https://github.com/hden)
* [Cuid2 for ColdFusion](https://github.com/bennadel/CUID2-For-ColdFusion) - [Ben Nadel](https://github.com/bennadel)
* [Cuid2 for Dart](https://github.com/obsidiaHQ/cuid2) - [George Mamar](https://github.com/obsidiaHQ)
* [Cuid2 for Java](https://github.com/thibaultmeyer/cuid-java) - [Thibault Meyer](https://github.com/thibaultmeyer)
* [Cuid2 for .NET](https://github.com/visus-io/cuid.net) - [Visus](https://github.com/xaevik)
* [Cuid2 for PHP](https://github.com/visus-io/php-cuid2) - [Visus](https://github.com/xaevik)
* [Cuid2 for Python](https://github.com/gordon-code/cuid2) - [Gordon Code](https://github.com/gordon-code)
* [Cuid2 for Ruby](https://github.com/stulzer/cuid2/blob/main/lib/cuid2.rb) - [Rubens Stulzer](https://github.com/stulzer)
* [Cuid2 for Rust](https://github.com/mplanchard/cuid-rust) - [Matthew Planchard](https://github.com/mplanchard)

## Improvements Over Cuid

The original Cuid served us well for more than a decade. We used it across 2 different social networks, and to generate ids for Adobe Creative Cloud. We never had a problem with collisions in production systems using it. But there was room for improvement.

### Better Collision Resistance

Available entropy is the maximum number of unique ids that can be generated. Generally more entropy leads to lower probability of collision. For simplicity, we will assume a perfectly random distribution in the following discussion.

The original Cuid ran for more than 10 years in across thousands of software implementations with zero confirmed collision reports, in some cases with more than 100 million users generating ids.

The original Cuid had a maximum available entropy of about `3.71319E+29` (assuming 1 id per session). That's already a really big number, but the maximum recommended entropy in Cuid2 is `4.57458E+49`. For reference, that's about the same entropy difference as the size of a mosquito compared to the distance from earth to the nearest star. Cuid2 has a default entropy of `1.62155E+37`, which is a significant increase from the original Cuid and is comparable to the difference between the size of a baseball and the size of the moon.

The hashing function mixes all the sources of entropy together into a single value, so it's important we use a high quality hashing algorithm. We have tested billions of ids with Cuid2 with zero collisions detected to-date.


### More Portable

The original Cuid used different methods to generate fingerprints across different kinds of hosts, including browsers, Node, and React Native. Unfortunately, this caused several compatability problems across the cuid user ecosystem.

In Node, each production host was slightly different, and we could reliable grab process ids and such to differentiate between hosts. Our early assumptions about different hosts generating different PIDs in Node proved to be false when we started deploying on cloud virtual hosts using identical containers and micro-container architectures. The result was that host fingerprint entropy was low in Node, limiting their ability to provide good collision resistance for horizontal server scaling in environments like cloud workers and micro-containers.

It was also not possible to customize your fingerprint function if you had different fingerprinting needs using Cuid, e.g., if both `global` and `window` are `undefined`.

Cuid2 uses a list of all global names in the JavaScript environment. Hashing it produces a very good host fingerprint, but we intentionally did not include a hash function in the original Cuid because all the secure ones we could find would bloat the bundle, so the original Cuid was unable to take full advantage of all of that unique host entropy.

In Cuid2, we use a tiny, fast, security-audited, NIST-standardized hash function and we seed it with random entropy, so on production environments where the globals are all identical, we lose the unique fingerprint, but still get random entropy to replace it, strengthening collision resistance.


### Deterministic Length

Length was non-deterministic in Cuid. This worked fine in almost all cases, but proved to be problematic for some data structure uses, forcing some users to create wrapper code to pad the output. We recommend sticking to the defaults for most cases, but if you don't need strong uniqueness guarantees, (e.g., your use-case is something like username or URL disambiguation), it can be fine to use a shorter version.


### More Efficient Session Counter Entropy

The original Cuid wasted entropy on session counters that were not always used, rarely filled, and sometimes rolled over, meaning they could collide with each other if you generate enough ids in a tight loop, reducing their effectiveness. Cuid2 initializes the counter with a random number so the entropy is never wasted. It also uses the full precision of the native JS number type. If you only generate a single id, the counter just extends the random entropy, rather than wasting digits, providing even stronger anti-collision protection.


### Parameterized Length

Different use-cases have different needs for entropy resistance. Sometimes, a short disambiguating series of random digits is enough: for example, it's common to use short slugs to disambiguate similar names, e.g. usernames or URL slugs. Since the original cuid did not hash its output, we had to make some seriously limiting entropy decisions to produce a short slug. In the new version, all sources of entropy are mixed with the hash function, and you can safely grab a substring of any length shorter than 32 digits. You can roughly estimate how many ids you can generate before reaching 50% chance of collision with: [`sqrt(36^(n-1)*26)`](https://en.wikipedia.org/wiki/Birthday_problem#Square_approximation), so if you use `4` digits, you'll reach 50% chance of collision after generating only `~1101` ids. That might be fine for username disambiguation. Are there more than 1k people who want to share the same username?

By default, you'd need to generate `~4.0268498e+18` ids to reach a 50% chance of collision, and at maximum length, you'd need to generate `~6.7635614e+24` ids to reach 50% odds of collision. To use a custom length, import the `init` function, which takes configuration options:

```js
import { init } from '@paralleldrive/cuid2';
const length = 10; // 50% odds of collision after ~51,386,368 ids
const cuid = init({ length });
console.log(cuid()); // nw8zzfaa4v
```


### Enhanced Security

The original Cuid leaked details about the id, including very limited data from the host environment (via the host fingerprint), and the exact time that the id was created. The new Cuid2 hashes all sources of entropy into a random-looking string.

Due to the hashing algorithm, it should not be practically possible to recover any of the entropy sources from the generated ids. Cuid used roughly monotonically increasing ids for database performance reasons. Some people abused them to select data by creation date. If you want to be able to sort items by creation date, we recommend making a separate, indexed `createdAt` field in your database instead of using monotonic ids because:

* It's easy to trick a client system to generate ids in the past or future.
* Order is not guaranteed across multiple hosts generating ids at nearly the same time.
* Deterministically monotic resolution was never guaranteed.

In Cuid2, the hashing algorithm uses a salt. The salt is a random string which is added to the input entropy sources before the hashing function is applied. This makes it much more difficult for an attacker to guess valid ids, as the salt changes with each id, meaning the attacker is unable to use any existing ids as a basis for guessing others.


## Comparisons

Security was the primary motivation for creating Cuid2. Our ids should be default-secure for the same reason we use https instead of http. The problem is, all our current id specifications are based on decades-old standards that were never designed with security in mind, optimizing for database performance charactaristics which are no longer relevant in modern, distributed applications. Almost all of the popular ids today optimize for being k-sortable, which was important 10 years ago. Here's what k-sortable means, and why it's no longer as important is it was when we created the Cuid specification which [helped inspire current standards like UUID v6 - v8](https://www.ietf.org/archive/id/draft-ietf-uuidrev-rfc4122bis-00.html#section-11.2):


### Note on K-Sortable/Sequential/Monotonically Increasing Ids

TL;DR: Stop worrying about K-Sortable ids. They're not a big deal anymore. Use `createdAt` fields instead.

**The performance impact of using sequential keys in modern systems is often exaggerated.** If your database is too small to use cloud-native solutions, it's also too small to worry about the performance impact of sequential vs random ids unless you're living in the distant past (i.e. you're using hardware from 2010). If it's large enough to worry, random ids may still be faster.

In the past, sequential keys could potentially have a significant impact on performance, but this is no longer the case in modern systems.

One reason for using sequential keys is to avoid id fragmentation, which can require a large amount of disk space for databases with billions of records. However, at such a large scale, modern systems often use cloud-native databases that are designed to handle terabytes of data efficiently and at a low cost. Additionally, the entire database may be stored in memory, providing fast random-access lookup performance. Therefore, the impact of fragmented keys on performance is minimal.

Worse, K-Sortable ids are not always a good thing for performance anyway, because they can cause hotspots in the database. If you have a system that generates a large number of ids in a short period of time, the ids will be generated in a sequential order, causing the tree to become unbalanced, which will lead to frequent rebalancing. This can cause a significant performance impact.

So what kinds of operations suffer from a non-sequential id? Paged, sorted operations. Stuff like "fetch me 100000 records, sorted by id". That would be noticeably impacted, but how often do you need to sort by id if your id is opaque? I have never needed to. Modern cloud databases allow you to create indexes on `createdAt` fields which perform extremely well.

The worst part of K-Sortable ids is their impact on security. K-Sortable = insecure.


### The Contenders

We're unaware of any standard or library in the space that adequately meets all of our requirements. We'll use the following criteria to filter a list of commonly used alternatives. Let's start with the contenders:

Database increment (Int, BigInt, AutoIncrement), [UUID v1 - v8](https://www.ietf.org/archive/id/draft-ietf-UUIDrev-rfc4122bis-00.html), [NanoId](https://github.com/ai/nanoid), [Ulid](https://github.com/ulid/javascript), [Sony Snowflake](https://github.com/sony/sonyflake) (inspired by Twitter Snowflake), [ShardingID](https://instagram-engineering.com/sharding-ids-at-instagram-1cf5a71e5a5c) (Instagram), [KSUID](https://github.com/segmentio/ksuid), [PushId](https://firebase.blog/posts/2015/02/the-2120-ways-to-ensure-unique_68) (Google), [XID](https://github.com/rs/xid), [ObjectId](https://www.mongodb.com/docs/manual/reference/method/ObjectId/) (MongoDB).

Here are the disqualifiers we care about:

* **Leaks information:** Database auto-increment, all UUIDs (except V4 and including V6 - V8), Ulid, Snowflake, ShardingId, pushId, ObjectId, KSUID
* **Collision Prone:** Database auto-increment, v4 UUID
* **Not cryptographically secure random output:** Database auto-increment, UUID v1, UUID v4
* **Requires distributed coordination:** Snowflake, ShardingID, database increment
* **Not URL or name friendly:** UUID (too long, dashes), Ulid (too long), UUID v7 (too long) - anything else that supports special characters like dashes, spaces, underscores, #$%^&, etc.
* **Too fast:** UUID v1, UUID v4, NanoId, Ulid, Xid


Here are the qualifiers we care about:

* **Secure - No leaked info, attack-resistant:** Cuid2, NanoId (Medium - trusts web crypto API entropy).
* **Collision resistant:** Cuid2, Cuid v1, NanoId, Snowflake, KSUID, XID, Ulid, ShardingId, ObjectId, UUID v6 - v8.
* **Horizontally scalable:** Cuid2, Cuid v1, NanoId, ObjectId, Ulid, KSUID, Xid, ShardingId, ObjectId, UUID v6 - v8.
* **Offline-compatible:** Cuid2, Cuid v1, NanoId, Ulid, UUID v6 - v8.
* **URL and name-friendly:** Cuid2, Cuid v1, NanoId (with custom alphabet).
* **Fast and convenient:** Cuid2, Cuid v1, NanoId, Ulid, KSUID, Xid, UUID v4, UUID v7.
* **But not *too fast*:** Cuid2, Cuid v1, UUID v7, Snowflake, ShardingId, ObjectId.

Cuid2 is the only solution that passed all of our tests.


### NanoId and Ulid

Overall, NanoId and Ulid seem to hit most of our requirements, Ulid leaks timestamps, and they both trust the random entropy from the Web Crypto API too much. The Web Crypto API trusts 2 untrustworthy things: The [random entropy source](https://docs.rs/bug/0.2.0/bug/rand/index.html#cryptographic-security), and the hashing algorithm used to stretch the entropy into random-looking data. Some implementations have had [serious bugs that made them vulnerable to attack](https://bugs.chromium.org/p/chromium/issues/detail?id=552749).

Along with using cryptographically secure methods, Cuid2 supplies its own known entropy from a diverse pool and uses a security audited, NIST-standard cryptographically secure hashing algorithm.

**Too fast:** NanoId and Ulid are also very fast. But that's not a good thing. The faster you can generate ids, the faster you can run collision attacks. Bad guys looking for statistical anomalies in the distribution of ids can use the speed of NanoId to their advantage. Cuid2 is fast enough to be convenient, but not so fast that it's a security risk.


#### Entropy Security Comparison

* NanoId Entropy: Web Crypto.
* Ulid Entropy: Web Crypto + time stamp (leaked).
* Cuid2 Entropy: Web Crypto + time stamp + counter + host fingerprint + hashing algorithm.


## Testing

Before each commit, we test over 10 million ids generated in parallel across 7 different CPU cores. With each batch of tests, we run a histogram analysis to ensure an even, random distribution across the entire entropy range. Any bias would make it more likely for ids to collide, so our tests will automatically fail if it finds any.

<img width="783" alt="Screen Shot 2022-12-30 at 6 19 15 PM" src="public/histogram.png">


We also generate randograms and do spot visual inspections.

![randogram](public/randogram.png)

## Troubleshooting

Some React Native environments may be missing TextEncoding features, which will need to be polyfilled. The following have both worked for users who have encountered this issue:

```
npm install --save fast-text-encoding
```

Then, before importing Cuid2:

```js
import "fast-text-encoding";
```

Alternatively, if that doesn't work:

```
npm install --save text-encoding-polyfill
```

Then, before importing Cuid2:

```js
import "text-encoding-polyfill";
```

### Using in Jest

Jest uses jsdom, which builds a global object which doesn't comply with current standards. There is a known issue in Jest when jsdom environment is used. The results of `new TextEncoder().encode()` and `new Uint8Array()` are different, refer to [jestjs/jest#9983](https://github.com/jestjs/jest/issues/9983).

To work around this limitation on jsdom (and by extension, Jest), you'll need to use custom environment which overwrites Uint8Array provided by jsdom:

Install jest-environment-jsdom. Make sure to use the same version as your jest. See [this answer on Stackoverflow for reference](https://stackoverflow.com/a/72124554).

```
❯ npm i jest-environment-jsdom@27
```

Create `jsdom-env.js` file in the root:

```js
const JSDOMEnvironmentBase = require('jest-environment-jsdom');

Object.defineProperty(exports, '__esModule', {
    value: true
});

class JSDOMEnvironment extends JSDOMEnvironmentBase {
    constructor(...args) {
        const { global } = super(...args);

        global.Uint8Array = Uint8Array;
    }
}

exports.default = JSDOMEnvironment;
exports.TestEnvironment = JSDOMEnvironment;
```

Update scripts to use the custom environment:

```js
{
    // ...
    "scripts": {
        // ...
        "test": "react-scripts test --env=./jsdom-env.js",
        // ...
    },
}
```

#### JSDOM is Missing Features

JSDOM doesn't support TextEncoder and TextDecoder, refer jsdom/jsdom#2524.

In Jest, features like Uint8Array/TextEncoder/TextDecoder may be available in the jsdom environment but may produce results different from the platform standards. These are known bugs which may be resolved by jsdom at some point, but there is no clear ETA.

Note that this issue may impact any package that relies on the TextEncoder or TextDecorder standards. If you would like to use a simple test runner that just works, try [Riteway](https://github.com/paralleldrive/riteway).


## Sponsors

This project is made possible by:

* [DevAnywhere](https://devanywhere.io) - Expert mentorship for software builders, from junior developers to software leaders like VPE, CTO, and CEO.
* [EricElliottJS.com](https://ericelliottjs.com) - Learn JavaScript on demand with videos and interactive lessons.
