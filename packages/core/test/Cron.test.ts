import { triggerToCronExpression } from "../src"

describe('Cron', () => {
  describe('triggerToCronExpression', () => {
    test('should generate a valid cron for `everyMinute` triggers', () => {
      const expression = triggerToCronExpression({
        mode: 'everyMinute',
      })
      expect(expression).toMatch(/^[1-6]?[0-9] \* \* \* \* \*$/)
    })

    test('should generate a valid cron for `everyHour` triggers', () => {
      const expression = triggerToCronExpression({
        mode: 'everyHour',
        minute: 11,
      })
      expect(expression).toMatch(/^[1-6]?[0-9] 11 \* \* \* \*$/)
    })

    test('should generate a valid cron for `everyX[minutes]` triggers', () => {
      const expression = triggerToCronExpression({
        mode: 'everyX',
        unit: 'minutes',
        value: 42,
      })
      expect(expression).toMatch(/^[1-6]?[0-9] \*\/42 \* \* \* \*$/)
    })

    test('should generate a valid cron for `everyX[hours]` triggers', () => {
      const expression = triggerToCronExpression({
        mode: 'everyX',
        unit: 'hours',
        value: 3,
      })
      expect(expression).toMatch(/^[1-6]?[0-9] 0 \*\/3 \* \* \*$/)
    })

    test('should generate a valid cron for `everyDay` triggers', () => {
      const expression = triggerToCronExpression({
        mode: 'everyDay',
        hour: 13,
        minute: 17,
      })
      expect(expression).toMatch(/^[1-6]?[0-9] 17 13 \* \* \*$/)
    })

    test('should generate a valid cron for `everyWeek` triggers', () => {
      const expression = triggerToCronExpression({
        mode: 'everyWeek',
        hour: 13,
        minute: 17,
        weekday: 4,
      })
      expect(expression).toMatch(/^[1-6]?[0-9] 17 13 \* \* 4$/)
    })

    test('should generate a valid cron for `everyMonth` triggers', () => {
      const expression = triggerToCronExpression({
        mode: 'everyMonth',
        hour: 13,
        minute: 17,
        dayOfMonth: 12,
      })
      expect(expression).toMatch(/^[1-6]?[0-9] 17 13 12 \* \*$/)
    })

    test('should trim custom cron expressions', () => {
      const expression = triggerToCronExpression({
        mode: 'custom',
        cronExpression: ' 0 9-17 * * * ',
      })
      expect(expression).toEqual('0 9-17 * * *')
    })
  })
})
