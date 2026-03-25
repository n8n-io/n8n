import { it, expect } from 'vitest'
import { kResponsePromise, RequestController } from './RequestController'

it('creates a pending response promise on construction', () => {
  const controller = new RequestController(new Request('http://localhost'))
  expect(controller[kResponsePromise]).toBeInstanceOf(Promise)
  expect(controller[kResponsePromise].state).toBe('pending')
})

it('resolves the response promise with the response provided to "respondWith"', async () => {
  const controller = new RequestController(new Request('http://localhost'))
  controller.respondWith(new Response('hello world'))

  const response = (await controller[kResponsePromise]) as Response

  expect(response).toBeInstanceOf(Response)
  expect(response.status).toBe(200)
  expect(await response.text()).toBe('hello world')
})

it('resolves the response promise with the error provided to "errorWith"', async () => {
  const controller = new RequestController(new Request('http://localhost'))
  const error = new Error('Oops!')
  controller.errorWith(error)

  await expect(controller[kResponsePromise]).resolves.toEqual(error)
})

it('throws when calling "respondWith" multiple times', () => {
  const controller = new RequestController(new Request('http://localhost'))
  controller.respondWith(new Response('hello world'))

  expect(() => {
    controller.respondWith(new Response('second response'))
  }).toThrow(
    'Failed to respond to the "GET http://localhost/" request: the "request" event has already been handled.'
  )
})

it('throws when calling "errorWith" multiple times', () => {
  const controller = new RequestController(new Request('http://localhost'))
  controller.errorWith(new Error('Oops!'))

  expect(() => {
    controller.errorWith(new Error('second error'))
  }).toThrow(
    'Failed to error the "GET http://localhost/" request: the "request" event has already been handled.'
  )
})
