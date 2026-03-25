import { Gateway } from './gateway'
import { lookupResponseAsync } from '../test/index'

export class Mock extends Gateway {
  get() {
    this.callMock()
  }

  head() {
    this.callMock()
  }

  post() {
    this.callMock()
  }

  put() {
    this.callMock()
  }

  patch() {
    this.callMock()
  }

  delete() {
    this.callMock()
  }

  callMock() {
    return lookupResponseAsync(this.request)
      .then((response) => this.dispatchResponse(response))
      .catch((e) => this.dispatchClientError(e.message, e))
  }
}

export default Mock
