package main

import (
	"fmt"
	"os"
)

// HelloWorld prints a greeting message
func HelloWorld(name string) string {
	if name == "" {
		name = "World"
	}
	return fmt.Sprintf("Hello, %s!", name)
}

func main() {
	name := "Go"
	if len(os.Args) > 1 {
		name = os.Args[1]
	}

	greeting := HelloWorld(name)
	fmt.Println(greeting)
}
