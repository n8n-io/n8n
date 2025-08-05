package main

import (
	"fmt"
	"time"
)

func main() {
	var data interface{} = "test"
	fmt.Println(data)

	// Forbidden pattern: time.Sleep
	time.Sleep(1 * time.Second)

	// Forbidden pattern: panic
	panic("oops")
}
