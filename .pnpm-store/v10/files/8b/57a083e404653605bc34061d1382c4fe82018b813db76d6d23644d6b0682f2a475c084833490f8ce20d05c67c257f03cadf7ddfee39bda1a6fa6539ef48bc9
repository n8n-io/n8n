// From:
// https://github.com/apache/kafka/blob/trunk/clients/src/main/java/org/apache/kafka/common/resource/PatternType.java#L32

/**
 * @typedef {number} ACLResourcePatternTypes
 *
 * Enum for ACL Resource Pattern Type
 * @readonly
 * @enum {ACLResourcePatternTypes}
 */
module.exports = {
  /**
   * Represents any PatternType which this client cannot understand, perhaps because this client is too old.
   */
  UNKNOWN: 0,
  /**
   * In a filter, matches any resource pattern type.
   */
  ANY: 1,
  /**
   * In a filter, will perform pattern matching.
   *
   * e.g. Given a filter of {@code ResourcePatternFilter(TOPIC, "payments.received", MATCH)`}, the filter match
   * any {@link ResourcePattern} that matches topic 'payments.received'. This might include:
   * <ul>
   *     <li>A Literal pattern with the same type and name, e.g. {@code ResourcePattern(TOPIC, "payments.received", LITERAL)}</li>
   *     <li>A Wildcard pattern with the same type, e.g. {@code ResourcePattern(TOPIC, "*", LITERAL)}</li>
   *     <li>A Prefixed pattern with the same type and where the name is a matching prefix, e.g. {@code ResourcePattern(TOPIC, "payments.", PREFIXED)}</li>
   * </ul>
   */
  MATCH: 2,
  /**
   * A literal resource name.
   *
   * A literal name defines the full name of a resource, e.g. topic with name 'foo', or group with name 'bob'.
   *
   * The special wildcard character {@code *} can be used to represent a resource with any name.
   */
  LITERAL: 3,
  /**
   * A prefixed resource name.
   *
   * A prefixed name defines a prefix for a resource, e.g. topics with names that start with 'foo'.
   */
  PREFIXED: 4,
}
